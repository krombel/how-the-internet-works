<script lang="ts">
  // Orchestration: one rAF loop drives the scene clock, packets, the camera (eased zoom flights, tracking a caught
  // packet) and the morph between places. Everything is generic over the scene tree; scenes and art only render what
  // this computes.
  import { onMount, tick, untrack } from 'svelte';
  import { TRAVEL, areaCentre, clampCam, fit, flyInterpolator, followStep, isShort, slideCams, smoothstep, toScreen, toWorldPt, travelInterpolator, viewportFor, zoomAbout, type Cam } from './engine/camera';
  import { WORLD_SIZE, bezier, lerp, type Curve, type Orient, type Pt } from './engine/geometry';
  import { attachGestures } from './engine/gestures';
  import { FADE_MS, SLIDE_MS, clockRate, easeInOutCubic, fadeOver, moveFor } from './engine/motion';
  import { caughtSpot, livePackets, packetNear, poseOn, specsFor, type LivePacket } from './engine/packets';
  import { sfx } from './engine/sound';
  import { speaker, spoken } from './engine/speech';
  import { textBox } from './engine/svg';
  import { camFor, decide, keyOf, kLimits, mixes, sceneInfo, travelK } from './engine/zoom';
  import { badgeSize, doorsInView, doorsOf, layoutDoors, type Door } from './model/doors';
  import { eraStops, eraYear, startDevice } from './model/era';
  import { belowOf, rungStep } from './model/ladder';
  import { morphScene, pathScene, type PathScene, type SLink, type SNode } from './model/layout';
  import type { Loc } from './model/location';
  import { entryHop, hopAhead, hopStepFor, stepHop, type Dir } from './model/packet';
  import { eraOf } from './model/registry';
  import type { Route } from './model/resolve';
  import { paceOf } from './model/speed';
  import { chainAt, chainItemAt, chainNear, chainOf, chainWarp, diveRuns, hopScenePath, parentPath, rectToRoot, sceneRef, sideways, stopRectLocal, toLocal, toRoot, travelOf, validPrefix, type Chain, type Frame } from './model/tree';
  import type { Mounted } from './render/ctx';
  import { artLoading, loadDevices, loadRouteArt } from './render/lazy.svelte';
  import World from './render/World.svelte';
  import { go, onNavigate, startRouter } from './router';
  import { loadDiveStrings, loadPastStrings, loadTheme, loc, nameW, nav, readAloud, reading, setPaused, settings, themeState, tr, trActivity, trCount, view } from './state.svelte';
  import { announce, arrival } from './ui/announce.svelte';
  import Announcer from './ui/Announcer.svelte';
  import Caption from './ui/Caption.svelte';
  import { captionFold, captionFor, sceneTitle, timeChip, type CaptionFold } from './ui/caption';
  import Chrome from './ui/Chrome.svelte';
  import { COACH_ALL, COACHED, coachRun, type CoachRun } from './ui/coach';
  import type CoachMarksT from './ui/CoachMarks.svelte';
  import type PeekPanelT from './ui/PeekPanel.svelte';
  import PlacePicker from './ui/PlacePicker.svelte';
  import { allowedPlaces, pictures, placeOptions } from './ui/picker';
  import SceneKeys from './ui/SceneKeys.svelte';
  import StepButtons from './ui/StepButtons.svelte';
  import type TextMapT from './ui/TextMap.svelte';
  import type TimeMachineT from './ui/TimeMachine.svelte';
  import type { elsewhere as Elsewhere } from './ui/time';

  startRouter();
  let stage: HTMLDivElement;
  const A = $derived(themeState.current.art);
  const route = $derived(nav.route);
  /** How much slower the parcels go on this route (#59: slow in older eras). */
  const pace = $derived(paceOf(route));
  const here = $derived(nav.loc);
  const hereKey = $derived(keyOf(here.path));

  // ------------------------------------------------------------------ camera + flights
  /** A flight (eased here), a sideways travel along a path scene's chain (it eases its own legs) or a slide between
   *  rungs of a stack. */
  interface Trans { b: Cam; t0: number; dur: number; fly: (t: number) => Cam; travel: Travel | null; slide: Slide | null }
  /** Travelling along the chain of the path scene `key`: `s(t)` is the arc the view centre is at (from `a` to `b`),
   *  `start` the dive the whole glide set off from (a chained step keeps it). */
  interface Travel { key: string; chain: Chain; frame: Frame; nodes: Map<string, SNode>; kT: number; a: number; b: number; s: (t: number) => number; start: string[] }
  let cam = $state.raw<Cam>({ x: 0, y: 0, k: 1 });
  let trans: Trans | null = null;
  /** A slide (#62): the scene going out (`from`), the camera that keeps its panel where the new one is, and which way
   *  it goes (1: down the stack, the new layer comes up from below). */
  interface Slide { from: string; cam: (t: number) => Cam; dir: 1 | -1 }
  /** During a slide, this frame of it: the scene going out, its camera, and how far along (eased, 0–1). */
  let sliding = $state.raw<{ from: string; cam: Cam; dir: 1 | -1; e: number } | null>(null);
  /** During a flight: where we came from (still blended in) and where we go (mounted from the start). */
  let flight = $state.raw<{ from: string[]; to: string[] } | null>(null);
  /** During a travel: the link or device of the path scene we're passing (it lights up as the camera glides by). */
  let passing = $state.raw<{ key: string; stop: string } | null>(null);
  /** During a travel: where from and where to, and whether we're past half way; and the device we're passing, where
   *  the medium changes ("Wi‑Fi → Cable"), at its place on screen, fading in and out as we pass. */
  let trip = $state.raw<{ from: string; to: string; past: boolean } | null>(null);
  let change = $state.raw<{ text: string; x: number; y: number; below: boolean; alpha: number } | null>(null);
  /** Test hook: hold transitions at this t (0–1) for a frame strip. */
  let holdT: number | null = null;
  let gestureNav = false;
  let gestures: ReturnType<typeof attachGestures> | undefined;

  const target = () => camFor(route, here.path, here.stop, view.vp, view.orient);

  function startTrans(from: string[], to: string[], b: Cam, durMs?: number) {
    const fly = flyInterpolator(cam, b, view.vp);
    const dur = durMs ?? fly.duration * themeState.current.motion.speed;
    trans = { b, t0: performance.now(), dur, fly: (t) => fly(easeInOutCubic(t)), travel: null, slide: null };
    flight = { from, to };
    passing = null;
    return dur;
  }
  /** In place between two rungs of a stack (#62): the panel stays (easing to the new one's fit), the layer leaves it
   *  and the next comes in from below (down the stack) or above, and nothing else shows. */
  function startSlide(from: string[], to: string[], dir: 1 | -1) {
    const o = view.orient, b = target(), cams = slideCams(cam, b, sceneInfo(route, from, o).frame, sceneInfo(route, to, o).frame);
    const dur = SLIDE_MS * themeState.current.motion.speed;
    trans = { b, t0: performance.now(), dur, fly: (t) => cams(easeInOutCubic(t)).b, travel: null, slide: { from: keyOf(from), cam: (t) => cams(easeInOutCubic(t)).a, dir } };
    // its first frame now, so the next layer is never drawn where it stands in the stack
    frameTrans(trans.t0);
    return dur;
  }
  /** Sideways between two children on a path scene's chain (#36): out, along the path, in. A step during a travel
   *  carries on from where the camera is, at the speed it's going, without snapping to the last target first; after
   *  a travel was cut short (a finger on the stage), it sets off from where the camera stopped. */
  function startTravel(from: string[], to: string[], tv: { parent: string[]; b: number }) {
    const o = view.orient, key = keyOf(tv.parent), info = sceneInfo(route, tv.parent, o), speed = themeState.current.motion.speed;
    const chain = chainOf(route, info.ref.group, o), now = performance.now(), T = TRAVEL;
    const c = areaCentre(view.vp);
    let a = chainNear(chain, toLocal(info.frame, toWorldPt(cam, c.x, c.y))), v0 = 0, start = from;
    const R = trans?.travel?.key === key ? trans : null;
    if (R) {
      const t = transT(R, now), dt = 0.02, s = R.travel!.s;
      a = s(t);
      v0 = (((s(Math.min(1, t + dt)) - a) * Math.sign(tv.b - a)) / (dt * R.dur)) * info.frame.s * speed;
      // a glide that turns back to where it set off from is a trip from the step it turned back from
      start = keyOf(R.travel!.start) === keyOf(to) ? from : R.travel!.start;
    }
    const kT = travelK(route, tv.parent, to, view.vp, o);
    const warp = chainWarp(chain, a, tv.b, T.slow, (T.slowR * view.vp.w) / (kT * info.frame.s));
    const b = target(), along = (u: number) => toRoot(info.frame, chainAt(chain, warp.at(u)));
    const devices = chain.items.filter((it) => it.tech === null && (it.s - a) * (tv.b - it.s) > 0).length;
    const fly = travelInterpolator(cam, b, along, Math.abs(tv.b - a) * info.frame.s, kT, view.vp, { devices, v0: v0 / warp.rate0, chained: !!R });
    const nodes = new Map(pathScene(route, info.ref.group, o).nodes.map((n) => [n.id, n]));
    trans = { b, t0: now, dur: fly.duration * speed, fly, travel: { key, chain, frame: info.frame, nodes, kT, a, b: tv.b, s: (t) => warp.at(fly.pos(t)), start }, slide: null };
    flight = { from, to };
    trip = { from: sceneTitle(route, start, o), to: sceneTitle(route, to, o), past: false };
  }
  const transT = (T: Trans, now: number) => holdT ?? Math.min(1, (now - T.t0) / T.dur);
  function frameTrans(now: number) {
    const T = trans!, t = transT(T, now);
    cam = T.fly(t);
    if (T.travel) followTravel(T.travel, t);
    if (T.slide) sliding = { from: T.slide.from, cam: T.slide.cam(t), dir: T.slide.dir, e: easeInOutCubic(t) };
    if (t >= 1) finishTrans();
  }
  /** Light up what the travel passes, and name the change of medium at a device on the way. */
  function followTravel(tv: Travel, t: number) {
    const s = tv.s(t), stop = chainItemAt(tv.chain, s), k = cam.k * tv.frame.s;
    if (passing?.stop !== stop) passing = { key: tv.key, stop };
    const past = Math.abs(s - tv.a) > Math.abs(tv.b - tv.a) / 2;
    if (trip && trip.past !== past) trip = { ...trip, past };
    // the device nearest the view centre, if it's between the ends and the links either side differ
    const { items } = tv.chain, dir = Math.sign(tv.b - tv.a);
    let near = -1;
    for (let i = 1; i < items.length - 1; i++)
      if (items[i].tech === null && (items[i].s - tv.a) * dir > 0 && (tv.b - items[i].s) * dir > 0 && (near < 0 || Math.abs(items[i].s - s) < Math.abs(items[near].s - s))) near = i;
    const [was, now] = near < 0 ? [] : dir > 0 ? [items[near - 1].tech, items[near + 1].tech] : [items[near + 1].tech, items[near - 1].tech];
    const px = near < 0 ? Infinity : Math.abs(items[near].s - s) * k, fade = view.vp.w * TRAVEL.slowR;
    // near the device, and only while gliding (it goes as the camera zooms into the next dive)
    const alpha = (1 - smoothstep(fade * 0.5, fade * 1.2, px)) * (1 - smoothstep(1.15, 1.6, cam.k / tv.kT));
    const [wasName, nowName] = [was, now].map((id) => (id ? tr(`tech.${id}.name`) : ''));
    if (!wasName || !nowName || wasName === nowName || alpha <= 0.01) { if (change) change = null; return; }
    const text = `${wasName} → ${nowName}`;
    const n = tv.nodes.get(items[near].id)!, p = toScreen(cam, toRoot(tv.frame, n)), half = (n.size / 2) * k;
    const below = n.label === 'above';
    change = { text, x: p.x, y: p.y + (below ? half + 10 : -half - 10), below, alpha };
  }
  /** Stop a transition where it is. */
  function dropTrans() {
    trans = null;
    flight = null;
    sliding = null;
    passing = null;
    trip = null;
    change = null;
  }
  function finishTrans(b = trans!.b) {
    cam = b;
    dropTrans();
    showCaption = true;
  }
  /** Prefers-reduced-motion: cut straight to `b` under a short cross-fade of the picture as it was (#41). */
  function cutTo(b: Cam) {
    fadeOver(stage.querySelector(':scope > svg')!);
    finishTrans(b);
  }
  /** Back to `b` in the same scene (after a gesture, or letting a packet go): a short flight, or a cut. */
  function settleTo(b: Cam, ms: number) {
    if (view.still) cutTo(b);
    else startTrans(here.path, here.path, b, ms);
  }

  // ------------------------------------------------------------------ switching place / activity (morph)
  // A route's art (devices and backdrops, #91) loads when it is first shown: all of it, the groups' insides too, so a
  // flight into the internet finds it there. The start route's was loaded before the first paint (main.ts).
  $effect(() => { void loadRouteArt(route); });
  interface Morph { a: Route; t0: number; dur: number; placesA: string[] }
  let morph: Morph | null = null;
  let morphScenes = $state.raw(new Map<string, PathScene>());
  let morphPlaces = $state.raw<{ id: string; alpha: number; dx: number }[] | undefined>(undefined);
  const MORPH_MS = 750;

  function frameMorph(now: number) {
    const M = morph!, b = route, o = view.orient;
    const t = Math.min(1, (now - M.t0) / M.dur), e = easeInOutCubic(t);
    const m = new Map<string, PathScene>();
    for (const s of mounted) {
      const ra = sceneRef(M.a, s.path, o), rb = sceneRef(b, s.path, o);
      if (ra?.kind === 'path' && rb?.kind === 'path') m.set(s.key, morphScene(pathScene(M.a, ra.group, o), pathScene(b, rb.group, o), t));
    }
    const W = view.orient === 'portrait' ? 900 : 1600;
    const nowPlaces = b.slots.map((s) => s.place);
    morphPlaces = [
      ...M.placesA.filter((p) => !nowPlaces.includes(p)).map((id) => ({ id, alpha: 1 - e, dx: -W * 0.35 * e })),
      ...nowPlaces.map((id) => (M.placesA.includes(id) ? { id, alpha: 1, dx: 0 } : { id, alpha: e, dx: W * 0.35 * (1 - e) })),
    ];
    morphScenes = m;
    if (t >= 1) { morph = null; morphScenes = new Map(); morphPlaces = undefined; }
  }

  // ------------------------------------------------------------------ navigation
  let shownRoute = nav.route;
  function onNav(next: Loc, prev: Loc) {
    // whatever moves the camera now, the rest of a scroll's momentum or a drag must not take it back
    gestures?.interrupt();
    const a = shownRoute;
    shownRoute = nav.route;
    const switched = a !== nav.route;
    if (!switched && keyOf(next.path) === keyOf(prev.path) && next.stop === prev.stop) return;
    navigated = true;
    endCoach();
    speaker.cancel();
    if (switched || keyOf(next.path) !== keyOf(prev.path)) setExplore(false);
    if (caught && (switched || !catchNav)) release(true);
    const from = validPrefix(route, prev.path), tv = switched ? null : travelOf(route, from, next.path, view.orient);
    // the ladder as it was seen (`via` is still the last stack's link)
    const rung = switched ? 0 : rungStep(route, from, next.path, view.orient, via);
    const quick = gestureNav;
    gestureNav = false;
    const move = moveFor({ switched, travel: !!tv, rung: !!rung, still: view.still });
    // a flight (or a slide) first lands; a travel hands over from wherever its camera is, unless a slide follows
    if (trans && (!trans.travel || move === 'slide')) finishTrans();
    let dur = FADE_MS;
    if (move === 'fade') cutTo(target());
    else if (move === 'slide') dur = startSlide(from, next.path, rung as 1 | -1);
    else if (move === 'travel') startTravel(from, next.path, tv!);
    else if (move === 'morph') {
      morph = { a, t0: performance.now(), dur: MORPH_MS, placesA: a.slots.map((s) => s.place) };
      startTrans(next.path, next.path, target(), MORPH_MS);
    } else dur = startTrans(from, next.path, target(), quick ? 480 : undefined);
    if (move !== 'fade') showCaption = false;
    // the sound says what changed, however the camera gets there
    if (switched || tv || keyOf(next.path) === keyOf(prev.path)) sfx.swish();
    else sfx.whoosh(rung ? rung < 0 : next.path.length > prev.path.length, dur);
  }

  function settle() {
    const b = target(), vp = view.vp, info = sceneInfo(route, here.path, view.orient);
    const local = here.stop && info.ref.kind === 'path' ? stopRectLocal(pathScene(route, info.ref.group, view.orient), here.stop) : null;
    const r = local ? rectToRoot(info.frame, local) : info.fit;
    const x0 = Math.max(0, r.x * cam.k + cam.x), x1 = Math.min(vp.w, (r.x + r.w) * cam.k + cam.x);
    const y0 = Math.max(0, r.y * cam.k + cam.y), y1 = Math.min(vp.h, (r.y + r.h) * cam.k + cam.y);
    const visible = (Math.max(0, x1 - x0) * Math.max(0, y1 - y0)) / Math.min(vp.w * vp.h, r.w * r.h * cam.k * cam.k);
    if (cam.k < b.k * 0.97 || visible < 0.45) settleTo(b, 450);
  }

  // Sideways stepping: path scenes step through their stops; link dives between the parent's dives; layer dives up and
  // down the depth ladder: the layers on the link you're on, from the lowest down to its signal (#14, #32).
  let nudge = $state({ dir: 0, n: 0 });
  const stepInfo = $derived(sideways(route, here.path, here.stop, view.orient));
  /** The link of the last stack you stood on, so a layer both sides of a hop carry (IP) keeps you on your side. */
  let via = $state<string | null>(null);
  /** What lies below the scene you're in (the depth ladder). */
  const below = $derived(belowOf(route, here.path, view.orient, untrack(() => via)));
  $effect(() => { via = below?.kind === 'stack' ? below.link : null; });
  const ladder = $derived(stepInfo.kind === 'layer' && below?.kind === 'stack' ? below : null);
  function step(d: -1 | 1) {
    if (caught) return stepCaught(hopStepFor(caught.dir, d));
    const { kind, steps, i, min } = stepInfo, ni = ladder ? ladder.here - d : i + d;
    if (ladder ? ni < 0 || ni >= ladder.rungs.length : ni < min || ni >= steps.length) { sfx.bump(); nudge = { dir: d, n: nudge.n + 1 }; return; }
    if (ladder) go({ path: ladder.rungs[ni].path });
    else if (kind === 'stop') go({ stop: ni < 0 ? null : steps[ni] }, true);
    else go({ path: [...parentPath(here.path), steps[ni]] });
  }
  function up() {
    if (Coach) return endCoach();
    if (picker) return closePicker();
    if (TimeMachine) return closeTime();
    if (caught) return release();
    if (explore) return setExplore(false, true);
    if (here.stop) return go({ stop: null }, true);
    if (here.path.length) go({ path: parentPath(here.path) });
  }

  // ------------------------------------------------------------------ what's on screen
  const mix = $derived(mixes(cam, view.vp, route, flight ? [here.path, validPrefix(route, flight.from)] : [here.path], view.orient));
  const mounted = $derived.by((): Mounted[] => {
    const keys = new Map<string, number>();
    for (const [k, a] of mix) if (a > 0.002) keys.set(k, a);
    for (const p of flight ? [here.path, flight.to] : [here.path])
      for (let i = 0; i <= p.length; i++) {
        const k = keyOf(p.slice(0, i));
        if (!keys.has(k)) keys.set(k, mix.get(k) ?? 0);
      }
    const list: Mounted[] = [...keys].map(([key, alpha]) => ({ key, path: key ? key.split('/') : [], alpha })).sort((a, b) => a.path.length - b.path.length);
    const S = sliding;
    if (!S) return list;
    // a slide (#62): the two layers in one panel and nothing else, the one coming in drawn last (it draws the edge)
    const into = (key: string, slide: Mounted['slide']): Mounted => ({ key, path: key ? key.split('/') : [], alpha: 1, slide });
    return [
      ...list.filter((m) => m.key !== S.from && m.key !== hereKey).map((m) => ({ ...m, alpha: 0 })),
      into(S.from, { cam: S.cam, shift: -S.dir * S.e, edge: false }),
      into(hereKey, { shift: S.dir * (1 - S.e), edge: true }),
    ];
  });

  // ------------------------------------------------------------------ packets, pause + the caught packet
  // Pause stops all motion, everywhere (#53, WCAG 2.2.2): everything that moves runs on the scene clock. Catching a
  // packet pauses it too, while it's held (issue #17). The caught packet waits at a hop (just before it, on the link it
  // arrives by) and ◀ ▶ step it along its path, gliding from hop to hop; the peek panel shows its layers at that hop.
  interface Caught { flow: string; kind: string; dir: Dir; colour?: string; spec: LivePacket['spec']; hop: number; hide?: string }
  interface Spot { key: string; link: SLink; t: number }
  let packets = $state.raw(new Map<string, LivePacket[]>());
  let prevIds = new Map<string, Map<string, LivePacket>>();
  let caught = $state.raw<Caught | null>(null);
  /** The first-run coach marks while they show (their component, a lazy chunk; below), and the door they point at. */
  let Coach = $state.raw<typeof CoachMarksT | null>(null), coachHot = $state<string | null>(null), coaching = $state<CoachRun>(null);
  /** What the ⏸ button shows: the reader's pause, or a caught packet's. The coach marks hold the scene still too. */
  const held = $derived(settings.paused || !!caught);
  const paused = $derived(held || !!Coach);
  /** Where the caught packet is drawn, and its glide to the next spot (`then`: jump there once the glide ends). */
  let ghost: Spot | null = null;
  let glide: { a: number; b: number; t0: number; then: Spot | null } | null = null;
  /** The camera keeps the caught packet in view until the user pans or zooms. */
  let track = false, catchNav = false;
  let timeScale = 1, clock = 0, clockHeld = false;
  const GLIDE_MS = 600, CAUGHT_ID = 'caught';

  function togglePause() {
    if (caught) return release();
    setPaused(!settings.paused);
  }
  /** The spot at chain hop `h` in the scene at `path` (null if that scene doesn't draw the link). */
  function spotAt(path: string[], h: number, dir: Dir): Spot | null {
    const ref = sceneRef(route, path, view.orient);
    if (ref?.kind !== 'path') return null;
    const s = caughtSpot(pathScene(route, ref.group, view.orient), h, dir);
    return s && { key: keyOf(path), ...s };
  }
  /** Whether the scene at `path` draws chain hop `h` (not just the group it is in). */
  const drawnIn = (path: string[]) => (h: number) => keyOf(hopScenePath(route, h, view.orient, path) ?? []) === keyOf(path);
  /** Hold `c`: its ghost glides from `from` to `to` along that link (then jumps to `then`), the camera tracking it. */
  function grab(c: Caught, from: Spot, to: number, then: Spot | null) {
    // caught from the list: letting go comes back to "What can I explore?", as the list is gone
    if (!caught) catchFrom = document.activeElement?.closest('.caption .doors') ? exploreBtn() : document.activeElement;
    setExplore(false);
    caught = c;
    ghost = from;
    glide = { a: from.t, b: to, t0: performance.now(), then };
    view.followId = CAUGHT_ID;
    track = true;
    dropTrans();
    sfx.pop();
  }
  function catchPacket(p: LivePacket, key: string) {
    const path = key ? key.split('/') : [];
    const hop = hopAhead(p.pose.link.link.index, p.dir, drawnIn(path));
    const spot = spotAt(path, hop, p.dir);
    if (!spot) return;
    // glide from where it was caught to its hop (back to the start of its link if the hop ahead isn't drawn here)
    const t = tOf(p), same = p.pose.link.id === spot.link.id;
    grab({ flow: p.flow, kind: p.kind, dir: p.dir, colour: p.colour, spec: p.spec, hop, hide: p.id },
      { key, link: p.pose.link, t }, same ? spot.t : p.dir === 'up' ? 0 : 1, same ? null : spot);
  }
  // The peek panel (with its envelopes and protocol tree) loads on the first catch, to keep the first load small.
  let PeekPanel = $state.raw<typeof PeekPanelT | null>(null);
  $effect(() => {
    if (caught && !PeekPanel) Promise.all([import('./ui/PeekPanel.svelte'), loadDiveStrings()]).then(([m]) => (PeekPanel = m.default));
  });
  $effect(() => { if (stepInfo.kind !== 'stop') void loadDiveStrings(); });
  /** Catch a packet of a kind where it enters the scene on screen (the caption's "Catch" chips, issue #74): at the
   *  first hop on its way that this scene draws, gliding in along the link it arrives by, so ◀ ▶ can take it on across
   *  the scene. It looks like the packets of that kind here (the scene's own spec of it), moving or not. */
  function catchKind(kind: string) {
    const ref = sceneRef(route, here.path, view.orient);
    if (ref?.kind !== 'path') return false;
    const spec = specsFor(pathScene(route, ref.group, view.orient), route.activity.flows, pace).find((s) => s.kind === kind);
    if (!spec) return false;
    const hop = entryHop(route, spec.dir, drawnIn(here.path));
    const spot = hop === null ? null : spotAt(here.path, hop, spec.dir);
    if (hop === null || !spot) return false;
    grab({ flow: spec.flow, kind, dir: spec.dir, colour: spec.colour, spec, hop }, { ...spot, t: spec.dir === 'up' ? 0 : 1 }, spot.t, null);
    return true;
  }
  /** The packet kinds to catch here, named (path scenes only). */
  const catchable = $derived(stepInfo.kind === 'stop'
    ? [...new Set(route.activity.flows.flatMap((f) => f.packets.map((k) => k.kind)))].map((kind) => ({ kind, name: trActivity(route.activity, `packet.${kind}`) }))
    : []);
  /** A live packet's position along its scene link (0–1, the link's own direction). */
  function tOf(p: LivePacket) {
    const l = p.pose.link;
    let best = 0, d = Infinity;
    for (let i = 0; i <= 40; i++) { const b = bezier(l, i / 40), e = Math.hypot(b.x - p.pose.x, b.y - p.pose.y); if (e < d) { d = e; best = i / 40; } }
    return best;
  }
  function stepCaught(d: -1 | 1) {
    const C = caught!, g = ghost!, next = stepHop(route, C.hop, C.dir, d);
    if (next === null) { sfx.bump(); return; }
    const up = C.dir === 'up', from = up ? 0 : 1;
    const path = hopScenePath(route, next, view.orient, here.path) ?? here.path;
    const spot = spotAt(path, next, C.dir);
    if (!spot) return;
    caught = { ...C, hop: next };
    track = true;
    sfx.blip(true, C.dir);
    if (spot.key !== g.key) {
      ghost = spot;
      glide = null;
      catchNav = true;
      go({ path });
      catchNav = false;
      return;
    }
    const now = performance.now();
    if (spot.link.id === g.link.id) glide = { a: g.t, b: spot.t, t0: now, then: null };
    else if (d > 0) { ghost = spot; glide = { a: from, b: spot.t, t0: now, then: null }; }
    else glide = { a: g.t, b: from, t0: now, then: spot };
  }
  function release(silent = false) {
    if (!caught) return;
    caught = null; ghost = null; glide = null; view.followId = null;
    void tick().then(() => keepFocus(catchFrom));
    if (!silent) settleTo(target(), 800);
  }
  function ghostPose(now: number) {
    if (glide) {
      const u = Math.min(1, (now - glide.t0) / GLIDE_MS);
      ghost = { ...ghost!, t: lerp(glide.a, glide.b, easeInOutCubic(u)) };
      if (u >= 1) { ghost = glide.then ?? ghost; glide = null; }
    }
    const g = ghost!, ref = sceneRef(route, g.key ? g.key.split('/') : [], view.orient);
    return ref?.kind === 'path' ? poseOn(pathScene(route, ref.group, view.orient), g.link, g.t, caught!.dir) : null;
  }

  function framePackets(now: number) {
    const next = new Map<string, LivePacket[]>(), o = view.orient;
    const pose = caught && ghost ? ghostPose(now) : null;
    for (const m of mounted) {
      if (m.alpha <= 0.002) continue;
      const ref = sceneInfo(route, m.path, o).ref;
      if (ref.kind !== 'path') continue;
      const own = pathScene(route, ref.group, o), shown = morphScenes.get(m.key) ?? own;
      let list = livePackets(specsFor(own, route.activity.flows, pace), shown.links, view.time, m.key);
      const ids = new Map(list.map((p) => [p.id, p]));
      for (const [id, p] of prevIds.get(m.key) ?? []) if (!ids.has(id) && m.key === hereKey && p.age > p.spec.duration * 0.85 && !speaker.speaking) sfx.blip(false, p.dir);
      prevIds.set(m.key, ids);
      if (caught) {
        list = list.filter((p) => p.id !== caught!.hide);
        if (pose && m.key === ghost!.key) list.push({ id: CAUGHT_ID, kind: caught.kind, flow: caught.flow, dir: caught.dir, colour: caught.colour, age: 0, spec: caught.spec, pose });
      }
      next.set(m.key, list);
    }
    packets = next;
  }

  // ------------------------------------------------------------------ taps, hover, doors
  const nearLink = (l: Curve, p: Pt) => {
    let best = Infinity;
    for (let i = 0; i <= 24; i++) { const b = bezier(l, i / 24); best = Math.min(best, Math.hypot(b.x - p.x, b.y - p.y)); }
    return best;
  };
  /** The open picker's slot, and the time machine's words for a place with no way online in this era (#59). */
  let picker = $state<{ slot: number; elsewhere?: typeof Elsewhere } | null>(null), pickFrom: Element | null = null;
  /** The picker is a modal dialog: the rest of the page is inert while it's open, and focus goes back after. It opens
   *  once its pictures are here (#91), at once after the first time. */
  function openPicker(slot: number) {
    pickFrom = document.activeElement;
    // a place with no way online in this era says so with the time machine's words, in the era's (the dive strings, #59)
    const instead = placeOptions(here.places[slot], route.era, allowedPlaces(here.activity, slot)).some((o) => o.instead);
    void Promise.all([instead && import('./ui/time'), instead && loadDiveStrings(), loadDevices(pictures())])
      .then(([time]) => (picker = { slot, elsewhere: time ? time.elsewhere : undefined }));
  }
  function closePicker() {
    picker = null;
    void tick().then(() => keepFocus(pickFrom));
  }
  // The list view (TextMap.svelte, #53): the whole scene tree as text, from ⋯ or the skip link. A dialog like the
  // picker; it loads (with the dive strings) on first use.
  let TextMap = $state.raw<typeof TextMapT | null>(null);
  let mapOpen = $state(false), mapFrom: Element | null = null;
  async function openMap(from: Element | null = document.activeElement) {
    mapFrom = from;
    [TextMap] = await Promise.all([TextMap ?? import('./ui/TextMap.svelte').then((m) => m.default), loadDiveStrings()]);
    mapOpen = true;
  }
  function closeMap() {
    mapOpen = false;
    void tick().then(() => keepFocus(mapFrom));
  }
  // The time machine (TimeMachine.svelte, #59): every era, from where you are (slot 0), from the top bar's button on
  // every screen, the caption's chip on the overview or the list view. A dialog like the picker; it loads, with the era
  // strings, when the button or the chip is pointed at. Travelling is a place switch with the start device's steps
  // carried over (`eraTrip`); when it lands, focus goes to the caption's title and the announcer says the era first.
  const eras = $derived(eraStops(route.slots[0].place, route.slots[0].options));
  const hereEra = $derived(eraOf(route.slots[0].place, route.content));
  /** The open time machine (its component), or null. What to say first on landing after a trip in time, or null. */
  let TimeMachine = $state.raw<typeof TimeMachineT | null>(null), timeFrom: Element | null = null, timeLanded: string | null = null;
  const loadTime = () => Promise.all([
    import('./ui/TimeMachine.svelte'), loadDiveStrings(), loadPastStrings(), loadDevices(eras.map((s) => startDevice(s.place))),
  ]).then(([m]) => m.default);
  function openTime(from: Element | null = document.activeElement) {
    timeFrom = from;
    void loadTime().then((m) => (TimeMachine = m));
  }
  function closeTime() {
    TimeMachine = null;
    void tick().then(() => keepFocus(timeFrom));
  }
  function timeFromPicker() {
    picker = null;
    openTime(pickFrom);
  }
  function timeFromMap() {
    mapOpen = false;
    openTime(mapFrom);
  }
  function travel({ trip, said }: { trip: Partial<Loc>; said: string }) {
    TimeMachine = null;
    timeLanded = said;
    go(trip);
  }
  /** Go somewhere picked in the list view; focus goes there in the scene. */
  function mapGo(path: string[], stop: string | null) {
    mapOpen = false;
    go({ path, stop });
    void tick().then(() => keepFocus(sceneSpot() ?? null));
  }
  /** The current path scene as drawn (mid-morph while switching place), or null in a dive. */
  const hereScene = () => {
    const info = sceneInfo(route, here.path, view.orient);
    return info.ref.kind === 'path' ? { info, ps: morphScenes.get(hereKey) ?? pathScene(route, info.ref.group, view.orient) } : null;
  };
  type Hit = { packet: LivePacket } | { door: Door } | { node: SNode } | { link: SLink };
  /** The scene's doors and their badges as drawn now (lit, hot, sized for the zoom), or null in a dive. */
  function badgesNow() {
    const at = hereScene();
    if (!at) return null;
    const { info, ps } = at, sk = cam.k * info.frame.s;
    const doors = doorsOf(ps, here.path.length === 0, diveRuns(route, ps.group, view.orient).byLink, view.orient, nameW), size = badgeSize(themeState.current.labelMinPx, sk);
    const badges = layoutDoors(doors, size, lit, hot, (d) => (textBox(tr(`door.${d.kind}`), 100, 'middle', 0.6, '--label-font').w * size) / 100);
    return { info, ps, sk, size, doors, badges };
  }
  /** How far behind a moving packet a tap may land and still catch it (seconds, real time). */
  const TAP_LAG = 0.25;
  /** What's under a screen point: a door's badge, a packet (a generous ≥ 30 px radius, for small fingers, trailing a
   *  moving one by `TAP_LAG`), what a door opens, or a stop. */
  function hitAt(sx: number, sy: number): Hit | null {
    const now = badgesNow();
    if (!now) return null;
    const { info, ps, sk, size, doors, badges } = now;
    const w = toLocal(info.frame, toWorldPt(cam, sx, sy)), minR = 30 / sk;
    const onBadge = (pad: number) => badges.findIndex((b) => Math.abs(b.x - w.x) < b.w / 2 + pad && Math.abs(b.y - w.y) < b.h / 2 + pad);
    // right on a badge beats a packet passing under it; near one, the packet wins
    let i = onBadge(0);
    if (i >= 0) return { door: doors[i] };
    const near = packetNear(packets.get(hereKey) ?? [], ps.links, TAP_LAG * timeScale, (p) => {
      const s = toScreen(cam, toRoot(info.frame, p));
      return Math.hypot(s.x - sx, s.y - sy);
    }, 32);
    if (near) return { packet: near };
    i = onBadge(Math.max(size * 0.2, minR - size * 1.2));
    if (i >= 0) return { door: doors[i] };
    for (const d of doors) {
      const l = d.kind === 'dive' ? ps.links.find((k) => k.id === d.id) : null;
      if (l && nearLink(l, w) < Math.max(46, minR)) return { door: d };
    }
    for (const n of ps.nodes) {
      if (Math.hypot(n.x - w.x, n.y - w.y) > Math.max(n.size * 0.55, minR)) continue;
      // a group opens up, a device with a dive of its own opens it (its door has its id; a link dive's door a link's)
      const d = doors.find((k) => k.kind !== 'swap' && k.id === n.id);
      if (d) return { door: d };
      if (n.kind === 'entry' || ps.stops.includes(n.id)) return { node: n };
    }
    for (const l of ps.links) if (ps.stops.includes(l.id) && nearLink(l, w) < Math.max(40, minR)) return { link: l };
    return null;
  }
  function openDoor(d: Door) {
    sfx.pop();
    if (d.kind !== 'swap') return go({ path: [...here.path, d.id] });
    const n = hereScene()?.ps.nodes.find((k) => k.id === d.id);
    openPicker(n?.hop.slot ?? 0);
  }
  function onTap(sx: number, sy: number) {
    const hit = hitAt(sx, sy);
    setExplore(false);
    if (hit && 'packet' in hit && hit.packet.id !== CAUGHT_ID) return catchPacket(hit.packet, hereKey);
    if (caught) return release();
    if (!hit || 'packet' in hit) { if (here.stop) go({ stop: null }, true); return; }
    if ('door' in hit) return openDoor(hit.door);
    sfx.pop();
    if ('link' in hit) return go({ stop: hit.link.id }, true);
    const n = hit.node;
    if (n.kind === 'entry') return go({ path: parentPath(here.path), stop: n.hop.id });
    go({ stop: here.stop === n.id ? null : n.id }, true);
  }
  /** The door under the mouse (it glows and shows its label) and the one whose caption chip is pointed at or focused. */
  let pointed = $state<string | null>(null), chipHot = $state<string | null>(null);
  function onHover(e: PointerEvent) {
    if (e.pointerType !== 'mouse' || e.buttons) return;
    const r = stage.getBoundingClientRect(), hit = hitAt(e.clientX - r.left, e.clientY - r.top);
    pointed = hit && 'door' in hit ? hit.door.id : null;
    stage.style.cursor = hit ? 'pointer' : '';
  }
  // "What can I explore?" (#122): every door in the scene lights up with its label, and the caption swaps its story
  // for the doors and the packets to catch, until it is tapped again, Esc, a tap on the scene, a catch or a scene
  // change. Focus goes into the list (once the caption shows) and the announcer says how many there are; closed from
  // the list, focus goes back to the button.
  const hereDoors = $derived.by(() => {
    const at = hereScene();
    return at ? doorsOf(at.ps, here.path.length === 0, diveRuns(route, at.ps.group, view.orient).byLink, view.orient, nameW) : [];
  });
  /** Exploring, and still waiting for the caption to show (after stepping back) to swap in the list. */
  let explore = $state(false), exploreIn = $state(false);
  /** The doors are lit ("What can I explore?", or the coach marks) and the one that glows. */
  const lit = $derived(explore || (!!Coach && coaching === 'all'));
  const hot = $derived(coachHot ?? chipHot ?? pointed);
  const exploreBtn = () => document.querySelector<HTMLElement>('.explore-btn');
  /** `back`: focus was in the list, so it goes back to the button (Esc). */
  function setExplore(on: boolean, back = false) {
    if (back && explore && document.activeElement?.closest('.caption')) void tick().then(() => exploreBtn()?.focus());
    explore = on;
    exploreIn = on;
    if (!on) chipHot = null;
  }
  function toggleExplore() {
    if (explore || !canExplore) return setExplore(false);
    const info = sceneInfo(route, here.path, view.orient);
    // at a stop (its caption lists only its own doors) or with doors off screen: step back to the whole scene, lit and
    // listed alike (the count the announcer says is enough)
    if (hereDoors.length && (here.stop || doorsInView(hereDoors, info.frame, cam, view.vp).length < hereDoors.length)) { go({ stop: null }, true); navigated = false; }
    sfx.pop();
    setExplore(true);
  }
  $effect(() => {
    if (!exploreIn || !showCaption || caught) return;
    const n = caption.doors.length + catchable.length;
    untrack(() => {
      exploreIn = false;
      void tick().then(() => captionEl?.querySelector<HTMLElement>('.doors button')?.focus());
      announce(trCount('explore.count', n));
    });
  });
  // First-run coach marks (#21, ui/coach.ts): a visit that starts at the top and has never had them gets them, once
  // the reader has seen the scene move for a moment; one that had them before the time machine came (#59) gets only
  // its card. They load as their own chunk, only then, and are remembered as soon as they show. While they show, the
  // doors are lit as by "What can I explore?" (not for the time machine's card alone) and the scene holds still (the
  // pause's clock); a tap anywhere, Esc or going anywhere ends them.
  const COACH_AFTER_MS = 700;
  async function startCoach() {
    const [m] = await Promise.all([import('./ui/CoachMarks.svelte'), new Promise((r) => setTimeout(r, COACH_AFTER_MS))]);
    const run = coachRun(localStorage.getItem(COACHED), here);
    if (!run || caught || picker || mapOpen || TimeMachine) return;
    localStorage.setItem(COACHED, COACH_ALL);
    coaching = run;
    Coach = m.default;
  }
  function endCoach() {
    if (!Coach) return;
    const had = !!document.activeElement?.closest('.coach');
    Coach = null;
    coachHot = null;
    if (had) void tick().then(() => keepFocus());
  }
  /** A door's badge on screen. */
  function badgeRect(d: Door) {
    const now = badgesNow(), b = now?.badges[now.doors.findIndex((k) => k.id === d.id)];
    if (!now || !b) return null;
    const p = toScreen(cam, toRoot(now.info.frame, { x: b.x - b.w / 2, y: b.y - b.h / 2 }));
    return { x: p.x, y: p.y, w: b.w * now.sk, h: b.h * now.sk };
  }
  // Into a layer from the peek panel: the tapped envelope grows into the dive's panel while the camera flies there (not
  // with prefers-reduced-motion: the camera cuts there, so there is no flight).
  let grow = $state.raw<{ from: DOMRect; head: Node; sealed: boolean; path: string[] } | null>(null);
  let growEl = $state<HTMLDivElement>();
  function openLayer(path: string[], env: HTMLElement) {
    const head = env.querySelector('.env-head')?.cloneNode(true) ?? null, sealed = env.classList.contains('sealed');
    release(true);
    go({ path });
    grow = head && trans ? { from: env.getBoundingClientRect(), head, sealed, path } : null;
  }
  $effect(() => { if (growEl && grow) growEl.replaceChildren(grow.head); });
  function frameGrow(now: number) {
    const G = grow!, el = growEl;
    if (!trans || keyOf(here.path) !== keyOf(G.path)) { grow = null; return; }
    if (!el) return;
    const t = Math.min(1, (now - trans.t0) / trans.dur), e = easeInOutCubic(Math.min(1, t / 0.55));
    const f = sceneInfo(route, G.path, view.orient).frame, W = WORLD_SIZE[view.orient], k = f.s * cam.k;
    const x = lerp(G.from.x, cam.x + f.x * cam.k, e), y = lerp(G.from.y, cam.y + f.y * cam.k, e);
    const w = lerp(G.from.width, W.w * k, e), h = lerp(G.from.height, W.h * k, e);
    el.style.transform = `translate(${x}px, ${y}px)`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.borderRadius = `${lerp(18, 60 * k, e)}px`;
    el.style.fontSize = `${Math.min(56, Math.max(14, h * 0.12))}px`;
    el.style.opacity = String(1 - smoothstep(0.6, 0.95, t));
  }

  /** `said`: a place took you to the era's own trip (#59). Going there lands like a trip in time (focus on the
   *  caption's title, the line said first); already there, the line is just said. */
  function pick({ places, activity, said }: { places?: string[]; activity?: string; said?: string }) {
    if (said && places?.join() !== here.places.join()) {
      picker = null;
      timeLanded = said;
    } else {
      closePicker();
      if (said) void tick().then(() => announce(said));
    }
    if (activity && activity !== here.activity) go({ activity, path: [] });
    else if (places) go({ places });
  }

  function onFlick(dx: number, dy: number) {
    const vertical = view.orient === 'portrait' || stepInfo.kind === 'layer';
    if (Math.abs(dx) > Math.abs(dy) * 1.2) { step(dx < 0 ? 1 : -1); return true; }
    if (vertical && Math.abs(dy) > Math.abs(dx) * 1.2) { step(dy > 0 ? 1 : -1); return true; }
    return false;
  }

  // ------------------------------------------------------------------ caption + chrome
  let showCaption = $state(true);
  let captionEl = $state<HTMLElement>();
  let captionH = $state(150);
  const caption = $derived(captionFor(route, here.path, here.stop, view.orient));
  /** Something to explore here: doors in the scene, or the caption's (a dive's "How it travels"), or packets. */
  const canExplore = $derived(hereDoors.length + caption.doors.length + catchable.length > 0);
  const crumbs = $derived(here.path.map((_, i) => here.path.slice(0, i + 1)).reduce(
    (out, p) => [...out, { title: sceneTitle(route, p, view.orient), path: p }],
    [{ title: sceneTitle(route, [], view.orient), path: [] as string[] }],
  ));
  const placeName = $derived(route.slots.map((s) => tr(`place.${s.place}.name`)).join(' + '));

  // ------------------------------------------------------------------ focus + what a screen reader hears (#53)
  // Focus never falls to the page or stays on something hidden: when a navigation lands (or a caught packet is let
  // go) and focus was on what went away, it goes to where you are in the scene (SceneKeys), else the caption's title;
  // otherwise focus stays put (◀ ▶, a crumb) and the announcer says where you are. Either way it says what lies below
  // and what the picture shows (`describe`), and read aloud, when it's on, reads the whole caption.
  let navigated = false;
  let catchFrom: Element | null = null;
  const focusable = (e: Element | null): e is HTMLElement => !!e && e !== document.body && e.isConnected && !e.closest('[inert]');
  const sceneSpot = () => [document.querySelector<HTMLElement>('.scene-key[tabindex="0"]')].find(focusable);
  /** The keyboard is in the scene (SceneKeys): the scene rings where you are. */
  let kbd = $state(false);
  function keepFocus(prefer: Element | null = null) {
    if (focusable(document.activeElement)) return false;
    (focusable(prefer) ? prefer : (sceneSpot() ?? captionEl?.querySelector<HTMLElement>('h2')))?.focus();
    return true;
  }
  $effect(() => {
    if (!showCaption || caught) return;
    const { title, body, describe, notes } = caption;
    const doors = !here.stop && below?.kind === 'doors' ? trCount('ladder.doors', below.doors.length) : '';
    untrack(() => {
      if (!navigated) return;
      navigated = false;
      readAloud(spoken(title, describe, body, ...notes.map((n) => n.text)));
      const said = { title, below: doors, describe, body };
      const landed = timeLanded ?? '', heading = timeLanded === null ? null : captionEl?.querySelector('h2');
      timeLanded = null;
      if (!keepFocus(heading)) announce(spoken(landed, arrival(said, loc.lang)));
      else if (describe || landed) announce(spoken(landed, arrival({ ...said, title: '' }, loc.lang)));
    });
  });
  const readAgain = $derived(reading() ? () => readAloud(spoken(caption.title, caption.describe, caption.body, ...caption.notes.map((n) => n.text))) : undefined);
  $effect(() => { document.title = `${caption.title} · ${tr('app.title')}`; });

  // ------------------------------------------------------------------ frame loop, gestures, resize
  const orientFor = (w: number, h: number): Orient => (h > w * 1.1 ? 'portrait' : 'landscape');
  /** Keep the caught packet in the part of the screen the peek panel doesn't cover (the wider side of it). */
  function trackCentre() {
    const c = areaCentre(view.vp), r = document.querySelector('.peek')?.getBoundingClientRect();
    if (!r) return c;
    if (view.orient === 'portrait') return { x: c.x, y: (view.vp.top + r.top) / 2 };
    return { x: r.left > view.vp.w - r.right ? r.left / 2 : (r.right + view.vp.w) / 2, y: c.y };
  }

  /** The caption's fold when it was last measured for the viewport (it folds by the viewport, so a refit may refold it). */
  let measuredFold: CaptionFold | undefined;
  function resize() {
    measuredFold = fold;
    const bar = document.querySelector('.chrome .controls')?.getBoundingClientRect();
    view.vp = viewportFor(stage, { top: bar ? bar.bottom + 8 : 0, bottom: captionEl ? captionEl.offsetHeight + 22 : 0 });
    const o = orientFor(view.vp.w, view.vp.h);
    if (o !== view.orient) { view.orient = o; prevIds = new Map(); }
    // the scenes are laid out anew: put a caught packet back at its hop (or let it go if this scene doesn't draw it)
    const spot = caught && spotAt(here.path, caught.hop, caught.dir);
    if (spot) { ghost = spot; glide = null; } else release(true);
    dropTrans();
    cam = target();
  }
  $effect(() => { const id = settings.style; untrack(() => { if (id !== themeState.current.id) void loadTheme(id).then(resize); }); });

  onMount(() => {
    const offNav = onNavigate(onNav);
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      timeScale = clockRate(timeScale, paused, dt);
      if (!clockHeld) clock += dt * timeScale;
      view.real = now / 1000;
      view.time = clock;
      if (morph) frameMorph(now);
      framePackets(now);
      if (caught && track && !trans && ghost) {
        const p = packets.get(ghost.key)?.find((k) => k.id === CAUGHT_ID);
        if (p) {
          const info = sceneInfo(route, ghost.key ? ghost.key.split('/') : [], view.orient);
          const k = fit(info.fit, view.vp).k * (view.orient === 'portrait' ? 1.6 : 1.8);
          const next = followStep(cam, toRoot(info.frame, p.pose), k, trackCentre(), dt);
          if (next.k !== cam.k || next.x !== cam.x || next.y !== cam.y) cam = next;
        }
      }
      if (grow) frameGrow(now);
      if (trans) frameTrans(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const ctl = {
      stop: dropTrans,
      zoomAt(f: number, sx: number, sy: number) {
        track = false;
        const lim = kLimits(route, here.path, view.vp, view.orient);
        const k = clampCam({ ...cam, k: cam.k * f }, view.vp, lim.min, lim.max).k;
        cam = zoomAbout(cam, k / cam.k, sx, sy);
      },
      panBy(dx: number, dy: number) {
        track = false;
        cam = { ...cam, x: cam.x + dx, y: cam.y + dy };
      },
    };
    stage.addEventListener('pointermove', onHover);
    stage.addEventListener('pointerleave', () => { pointed = null; stage.style.cursor = ''; });
    gestures = attachGestures(stage, ctl, {
      onTap, onFlick,
      onEnd() {
        const next = decide(cam, view.vp, route, here.path, view.orient);
        if (next) { gestureNav = true; go({ path: next }); }
        else settle();
      },
    });
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    if (coachRun(localStorage.getItem(COACHED), here)) void startCoach();
    const keys = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey || picker || mapOpen || TimeMachine) return;
      // a focused text that scrolls takes its arrow keys
      if (e.key !== 'Escape' && (e.target as Element).closest?.('[data-scroll]')) return;
      if (e.key === 'Escape') up();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') step(1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') step(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', keys);
    // the hints name keys after a key, gestures after a pointer
    const modality = (e: Event) => {
      if (e instanceof KeyboardEvent && ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
      view.keys = e.type === 'keydown';
    };
    window.addEventListener('keydown', modality, true);
    window.addEventListener('pointerdown', modality, true);
    // Test/screenshot hook (scripts/evaluate.mjs).
    Object.assign(window, {
      __app: {
        go, loc: () => nav.loc, busy: () => !!trans || !!morph || artLoading(),
        /** Catch a packet of a kind where it enters the scene on screen; then `step` it (±1 hop). */
        catch: (kind = 'video') => catchKind(kind),
        step(d: -1 | 1) { if (caught) stepCaught(d); },
        caught: () => caught && { hop: route.chain[caught.hop].id, dir: caught.dir },
        release: () => release(),
        /** Set the scene clock; `hold` keeps it there (stable frames for pixel diffs). */
        setClock(t: number, hold = false) { clock = t; clockHeld = hold; },
        /** Hold every transition at t (0–1), e.g. for a frame strip; null lets them run on. */
        hold(t: number | null) { holdT = t; if (trans && t === null) trans.t0 = performance.now() - trans.dur; },
        /** Tap the magnifier of a layer's envelope in the peek panel (while a packet is caught). */
        openLayer(layer: string) {
          const b = document.querySelector<HTMLButtonElement>(`.peek .env-${layer} > .env-go`);
          b?.click();
          return !!b;
        },
        picker(open = true) { if (open) openPicker(0); else closePicker(); },
        /** A door's badge on screen (in the current scene), e.g. to point the mouse at it. */
        doorAt(id: string) {
          const d = hereDoors.find((k) => k.id === id), info = sceneInfo(route, here.path, view.orient);
          if (!d) return null;
          const p = toScreen(cam, toRoot(info.frame, d.at)), r = stage.getBoundingClientRect();
          return [p.x + r.left, p.y + r.top];
        },
      },
    });
    return () => { offNav(); cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('keydown', keys);
      window.removeEventListener('keydown', modality, true); window.removeEventListener('pointerdown', modality, true); };
  });

  $effect(() => {
    const el = captionEl;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      captionH = el.offsetHeight;
      // the caption grew past the reserved inset (first measure, longer text), or the last refit (un)folded it: refit
      // while idle
      if (!trans && !caught && (fold !== measuredFold || Math.abs(view.vp.bottom - (captionH + 22)) > 30)) resize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  });
  $effect(() => { document.documentElement.style.setProperty('--cap-h', `${captionH}px`); });
  // how far down the top bar reaches: an open caption stops there
  $effect(() => { document.documentElement.style.setProperty('--top-h', `${view.vp.top}px`); });
  const portrait = $derived(view.orient === 'portrait');
  const small = $derived(view.vp.w < 700);
  const short = $derived(isShort(view.vp.w, view.vp.h));
  const fold = $derived(captionFold(view.vp.w, view.vp.h));
  const peekOpen = $derived(!!caught);
  /** Room to keep a layer stack open beside the scene: a gutter about as wide as the ladder, and the height for it
   *  above ▼. */
  const roomy = $derived.by(() => {
    if (portrait || short || view.vp.h < 820) return false;
    const info = sceneInfo(route, here.path, view.orient), c = fit(info.fit, view.vp);
    return info.fit.x * c.k + c.x >= 180;
  });
</script>

<div class={portrait ? 'port' : 'land'} inert={!!picker || mapOpen || !!TimeMachine}>
  <button class="skip btn card" onclick={() => openMap()}>{tr('map.skip')}</button>
  {#if Coach}
    <Coach run={coaching ?? 'all'} doors={hereDoors} {canExplore} wide={view.vp.w >= 1100} {eras} era={hereEra}
      rectOf={badgeRect} onhot={(id) => (coachHot = id)} onend={endCoach} />
  {/if}
  <Chrome {crumbs} {below} {roomy} onhot={(id) => (chipHot = id)} small={small || short} {short} wide={view.vp.w >= 1100} {explore} {canExplore} ontoggle={toggleExplore}
    time={eras.length > 1 ? { year: eraYear(route) } : null} timeOpen={!!TimeMachine} ontime={() => openTime()} onpretime={loadTime}
    paused={held} onpause={togglePause} quiet={peekOpen} onmap={openMap} />
  <main>
    <h1 class="sr">{tr('app.title')}</h1>
    <div id="stage" bind:this={stage} class={portrait ? 'port' : 'land'}>
      <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <A.Defs />
        <World {cam} {route} {mounted} {packets} scenes={morphScenes} places={morphPlaces} focus={passing ? { ...passing, hot: null, lit: false, kbd: false } : { key: hereKey, stop: here.stop, hot, lit, kbd }} />
        <A.Overlay w={view.vp.w} h={view.vp.h} time={view.time} />
      </svg>
    </div>
    <SceneKeys {route} path={here.path} stop={here.stop} {cam} vertical={portrait || stepInfo.kind === 'layer'} hidden={peekOpen}
      onopen={openDoor} onhot={(id) => (chipHot = id)} onkbd={(on) => (kbd = on)} />
    {#if caught && PeekPanel}
      <PeekPanel {route} {portrait} flow={caught.flow} kind={caught.kind} dir={caught.dir} hop={caught.hop} onstep={stepCaught} onclose={() => release()} ondive={openLayer} ondown={(path) => { release(true); go({ path }); }} />
    {/if}
    <!-- while a packet is caught, the peek panel's header takes over from the caption and the activity's crumb -->
    <Caption text={caption} place={placeName} onplace={() => openPicker(0)} time={timeChip(route, here.path)} ontime={() => openTime()} onpretime={loadTime} explore={explore && !exploreIn} catches={catchable} oncatch={catchKind}
      ondoor={(d) => { if (d.path) return go({ path: d.path }); const k = hereDoors.find((k) => k.id === d.id); if (k) openDoor(k); }} onhot={(id) => (chipHot = id)} onread={readAgain} hidden={!showCaption || peekOpen} {fold} bind:el={captionEl} />
    {#if !peekOpen}
      <StepButtons {portrait} layer={stepInfo.kind === 'layer'} canPrev={ladder ? ladder.here < ladder.rungs.length - 1 : stepInfo.i > stepInfo.min}
        canNext={ladder ? ladder.here > 0 : stepInfo.i < stepInfo.steps.length - 1} onstep={step} {nudge} />
    {/if}
    {#if trip}
      <div class="trip" aria-hidden="true"><span class:now={!trip.past}>{trip.from}</span><span class="arrow">→</span><span class:now={trip.past}>{trip.to}</span></div>
    {/if}
    {#if change}
      <div class="change" aria-hidden="true" style:opacity={change.alpha}
        style:transform="translate({change.x}px, {change.y}px) translate(-50%, {change.below ? 0 : -100}%)">{change.text}</div>
    {/if}
    {#if grow}<div class="env grow" class:sealed={grow.sealed} bind:this={growEl} aria-hidden="true"></div>{/if}
  </main>
</div>
<Announcer />
{#if picker}
  <PlacePicker places={here.places} activity={here.activity} slot={picker.slot} elsewhere={picker.elsewhere} onpick={pick} onclose={closePicker}
    ontime={picker.slot === 0 && eras.length > 1 ? timeFromPicker : undefined} />
{/if}
{#if mapOpen && TextMap}
  <TextMap {route} {here} caught={caught && route.chain[caught.hop].id} onclose={closeMap} ongo={mapGo} onswap={() => { mapOpen = false; openPicker(0); }}
    ontime={eras.length > 1 ? timeFromMap : undefined} />
{/if}
{#if TimeMachine}
  <TimeMachine stops={eras} here={hereEra} at={here} onpick={travel} onclose={closeTime} />
{/if}
