<script lang="ts">
  // Orchestration: one rAF loop drives the scene clock, packets, the camera (eased zoom flights, tracking a caught
  // packet) and the morph between places. Everything is generic over the scene tree; scenes and art only render what
  // this computes.
  import { onMount, untrack } from 'svelte';
  import { areaCentre, clampCam, fit, flyInterpolator, smoothstep, toScreen, toWorldPt, viewportFor, zoomAbout, type Cam } from './engine/camera';
  import { WORLD_SIZE, bezier, lerp, type Curve, type Orient, type Pt } from './engine/geometry';
  import { attachGestures } from './engine/gestures';
  import { easeInOutCubic } from './engine/motion';
  import { caughtSpot, livePackets, poseOn, specsFor, type LivePacket } from './engine/packets';
  import { sfx } from './engine/sound';
  import { textBox } from './engine/svg';
  import { camFor, decide, keyOf, kLimits, mixes, sceneInfo } from './engine/zoom';
  import { badgeSize, doorsInView, doorsOf, layoutDoors, type Door } from './model/doors';
  import { morphScene, pathScene, type PathScene, type SLink, type SNode } from './model/layout';
  import type { Loc } from './model/location';
  import { hopAhead, stepHop, type Dir } from './model/packet';
  import type { Route } from './model/resolve';
  import { hopScenePath, parentPath, rectToRoot, sceneRef, sideways, stopRectLocal, toLocal, toRoot, validPrefix } from './model/tree';
  import type { Mounted } from './render/ctx';
  import { divesLoading } from './render/dives.svelte';
  import World from './render/World.svelte';
  import { go, onNavigate, startRouter } from './router';
  import { loadTheme, nav, settings, themeState, tr, view } from './state.svelte';
  import Caption from './ui/Caption.svelte';
  import { captionFor, sceneTitle } from './ui/caption';
  import Chrome from './ui/Chrome.svelte';
  import PeekPanel from './ui/PeekPanel.svelte';
  import PlacePicker from './ui/PlacePicker.svelte';
  import StepButtons from './ui/StepButtons.svelte';

  startRouter();
  let stage: HTMLDivElement;
  const A = $derived(themeState.current.art);
  const route = $derived(nav.route);
  const here = $derived(nav.loc);
  const hereKey = $derived(keyOf(here.path));

  // ------------------------------------------------------------------ camera + flights
  interface Trans { b: Cam; t0: number; dur: number; fly: (t: number) => Cam }
  let cam = $state.raw<Cam>({ x: 0, y: 0, k: 1 });
  let trans: Trans | null = null;
  /** During a flight: where we came from (still blended in) and where we go (mounted from the start). */
  let flight = $state.raw<{ from: string[]; to: string[] } | null>(null);
  let gestureNav = false;

  const target = () => camFor(route, here.path, here.stop, view.vp, view.orient);

  function startTrans(from: string[], to: string[], b: Cam, durMs?: number) {
    const fly = flyInterpolator(cam, b, view.vp);
    const dur = durMs ?? fly.duration * themeState.current.motion.speed;
    trans = { b, t0: performance.now(), dur, fly };
    flight = { from, to };
    return dur;
  }
  function frameTrans(now: number) {
    const T = trans!;
    const t = Math.min(1, (now - T.t0) / T.dur);
    cam = T.fly(easeInOutCubic(t));
    if (t >= 1) finishTrans();
  }
  function finishTrans() {
    cam = trans!.b;
    trans = null;
    flight = null;
    showCaption = true;
  }

  // ------------------------------------------------------------------ switching place / activity (morph)
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
  const routeKey = (r: Route) => `${r.activity.id}/${r.slots.map((s) => s.place).join('+')}`;
  function onNav(next: Loc, prev: Loc) {
    const a = shownRoute;
    shownRoute = nav.route;
    const switched = a !== nav.route;
    if (!switched && keyOf(next.path) === keyOf(prev.path) && next.stop === prev.stop) return;
    if (switched || keyOf(next.path) !== keyOf(prev.path)) { setExplore(false); chipHot = null; }
    // (the route is a fresh state proxy after every navigation: compare what it is, not its identity)
    if (caught && (routeKey(a) !== routeKey(nav.route) || !catchNav)) release(true);
    if (trans) frameTrans(trans.t0 + trans.dur);
    if (switched) {
      morph = { a, t0: performance.now(), dur: MORPH_MS, placesA: a.slots.map((s) => s.place) };
      startTrans(next.path, next.path, target(), MORPH_MS);
      showCaption = false;
      sfx.swish();
      return;
    }
    const quick = gestureNav;
    gestureNav = false;
    const dur = startTrans(validPrefix(route, prev.path), next.path, target(), quick ? 480 : undefined);
    showCaption = false;
    if (keyOf(next.path) !== keyOf(prev.path)) sfx.whoosh(next.path.length > prev.path.length, dur);
    else sfx.swish();
  }

  function settle() {
    const b = target(), vp = view.vp, info = sceneInfo(route, here.path, view.orient);
    const local = here.stop && info.ref.kind === 'path' ? stopRectLocal(pathScene(route, info.ref.group, view.orient), here.stop) : null;
    const r = local ? rectToRoot(info.frame, local) : info.fit;
    const x0 = Math.max(0, r.x * cam.k + cam.x), x1 = Math.min(vp.w, (r.x + r.w) * cam.k + cam.x);
    const y0 = Math.max(0, r.y * cam.k + cam.y), y1 = Math.min(vp.h, (r.y + r.h) * cam.k + cam.y);
    const visible = (Math.max(0, x1 - x0) * Math.max(0, y1 - y0)) / Math.min(vp.w * vp.h, r.w * r.h * cam.k * cam.k);
    if (cam.k < b.k * 0.97 || visible < 0.45) startTrans(here.path, here.path, b, 450);
  }

  // Sideways stepping: path scenes step through their stops; link dives between the parent's dives; layer dives up and
  // down the layers of their hop.
  let nudge = $state({ dir: 0, n: 0 });
  const stepInfo = $derived(sideways(route, here.path, here.stop, view.orient));
  function step(d: -1 | 1) {
    if (caught) return stepCaught(d);
    const { kind, steps, i, min } = stepInfo, ni = i + d;
    if (ni < min || ni >= steps.length) { sfx.bump(); nudge = { dir: d, n: nudge.n + 1 }; return; }
    if (kind === 'stop') go({ stop: ni < 0 ? null : steps[ni] }, true);
    else go({ path: [...parentPath(here.path), steps[ni]] });
  }
  function up() {
    if (picker) return (picker = null);
    if (caught) return release();
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
    return [...keys].map(([key, alpha]) => ({ key, path: key ? key.split('/') : [], alpha })).sort((a, b) => a.path.length - b.path.length);
  });

  // ------------------------------------------------------------------ packets, pause + the caught packet
  // Catching a packet pauses the traffic (issue #17). The caught packet waits at a hop (just before it, on the link it
  // arrives by) and ◀ ▶ step it along its path, gliding from hop to hop; the peek panel shows its layers at that hop.
  interface Caught { flow: string; kind: string; dir: Dir; colour?: string; spec: LivePacket['spec']; hop: number; hide: string }
  interface Spot { key: string; link: SLink; t: number }
  let packets = $state.raw(new Map<string, LivePacket[]>());
  let prevIds = new Map<string, Map<string, LivePacket>>();
  let paused = $state(false);
  let pausedByCatch = false;
  let caught = $state.raw<Caught | null>(null);
  /** Where the caught packet is drawn, and its glide to the next spot (`then`: jump there once the glide ends). */
  let ghost: Spot | null = null;
  let glide: { a: number; b: number; t0: number; then: Spot | null } | null = null;
  /** The camera keeps the caught packet in view until the user pans or zooms. */
  let track = false, catchNav = false;
  let timeScale = 1, clock = 0;
  const GLIDE_MS = 600, CAUGHT_ID = 'caught';

  function togglePause() {
    if (paused && caught) return release();
    paused = !paused;
    pausedByCatch = false;
  }
  /** The spot at chain hop `h` in the scene at `path` (null if that scene doesn't draw the link). */
  function spotAt(path: string[], h: number, dir: Dir): Spot | null {
    const ref = sceneRef(route, path, view.orient);
    if (ref?.kind !== 'path') return null;
    const s = caughtSpot(pathScene(route, ref.group, view.orient), h, dir);
    return s && { key: keyOf(path), ...s };
  }
  function catchPacket(p: LivePacket, key: string) {
    const path = key ? key.split('/') : [];
    const drawn = (h: number) => keyOf(hopScenePath(route, h, view.orient, path) ?? []) === key;
    const hop = hopAhead(p.pose.link.link.index, p.dir, drawn);
    const spot = spotAt(path, hop, p.dir);
    if (!spot) return;
    caught = { flow: p.flow, kind: p.kind, dir: p.dir, colour: p.colour, spec: p.spec, hop, hide: p.id };
    // glide from where it was caught to its hop (back to the start of its link if the hop ahead isn't drawn here)
    const t = tOf(p), same = p.pose.link.id === spot.link.id;
    ghost = { key, link: p.pose.link, t };
    glide = { a: t, b: same ? spot.t : p.dir === 'up' ? 0 : 1, t0: performance.now(), then: same ? null : spot };
    if (!paused) { paused = true; pausedByCatch = true; }
    view.followId = CAUGHT_ID;
    track = true;
    trans = null;
    flight = null;
    sfx.pop();
  }
  /** Catch the youngest packet of a kind in the scene on screen (the caption's "Catch" chips). */
  function catchKind(kind: string) {
    const list = (packets.get(hereKey) ?? []).filter((k) => k.id !== CAUGHT_ID);
    const p = list.filter((k) => k.kind === kind).sort((x, y) => x.age / x.spec.duration - y.age / y.spec.duration)[0] ?? list[0];
    if (p) catchPacket(p, hereKey);
    return !!caught;
  }
  /** The packet kinds to catch here, named (path scenes only). */
  const catchable = $derived(stepInfo.kind === 'stop'
    ? [...new Set(route.activity.flows.flatMap((f) => f.packets.map((k) => k.kind)))].map((kind) => ({ kind, name: tr(`activity.${route.activity.id}.packet.${kind}`) }))
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
    if (pausedByCatch) paused = false;
    pausedByCatch = false;
    if (!silent) startTrans(here.path, here.path, target(), 800);
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
      let list = livePackets(specsFor(own, route.activity.flows), shown.links, view.time, m.key);
      const ids = new Map(list.map((p) => [p.id, p]));
      for (const [id, p] of prevIds.get(m.key) ?? []) if (!ids.has(id) && m.key === hereKey && p.age > p.spec.duration * 0.85) sfx.blip(false, p.dir);
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
  let picker = $state<{ slot: number } | null>(null);
  /** The current path scene as drawn (mid-morph while switching place), or null in a dive. */
  const hereScene = () => {
    const info = sceneInfo(route, here.path, view.orient);
    return info.ref.kind === 'path' ? { info, ps: morphScenes.get(hereKey) ?? pathScene(route, info.ref.group, view.orient) } : null;
  };
  type Hit = { packet: LivePacket } | { door: Door } | { node: SNode } | { link: SLink };
  /** What's under a screen point: a door's badge, a packet (a generous ≥ 30 px radius, for small fingers), what a door
   *  opens, or a stop. */
  function hitAt(sx: number, sy: number): Hit | null {
    const at = hereScene();
    if (!at) return null;
    const { info, ps } = at;
    const sk = cam.k * info.frame.s, w = toLocal(info.frame, toWorldPt(cam, sx, sy)), minR = 30 / sk;
    const doors = doorsOf(ps, here.path.length === 0), size = badgeSize(themeState.current.labelMinPx, sk);
    const badges = layoutDoors(doors, size, explore, chipHot ?? pointed, (d) => (textBox(tr(`door.${d.kind}`), 100, 'middle', 0.6, '--label-font').w * size) / 100);
    const onBadge = (pad: number) => badges.findIndex((b) => Math.abs(b.x - w.x) < b.w / 2 + pad && Math.abs(b.y - w.y) < b.h / 2 + pad);
    // right on a badge beats a packet passing under it; near one, the packet wins
    let i = onBadge(0);
    if (i >= 0) return { door: doors[i] };
    let best: { p: LivePacket; d: number } | null = null;
    for (const p of packets.get(hereKey) ?? []) {
      const s = toScreen(cam, toRoot(info.frame, p.pose)), d = Math.hypot(s.x - sx, s.y - sy);
      if (d < 32 && (!best || d < best.d)) best = { p, d };
    }
    if (best) return { packet: best.p };
    i = onBadge(Math.max(size * 0.2, minR - size * 1.2));
    if (i >= 0) return { door: doors[i] };
    for (const d of doors) {
      const l = d.kind === 'dive' ? ps.links.find((k) => k.id === d.id) : null;
      if (l && nearLink(l, w) < Math.max(46, minR)) return { door: d };
    }
    for (const n of ps.nodes) {
      if (Math.hypot(n.x - w.x, n.y - w.y) > Math.max(n.size * 0.55, minR)) continue;
      const d = doors.find((k) => k.kind === 'expand' && k.id === n.id);
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
    picker = { slot: n?.hop.slot ?? 0 };
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
  // "What can I explore?": every door in the scene lights up with its label, for a few seconds or until tapped again.
  const hereDoors = $derived.by(() => {
    const at = hereScene();
    return at ? doorsOf(at.ps, here.path.length === 0) : [];
  });
  let explore = $state(false), exploreTimer = 0;
  function setExplore(on: boolean) {
    clearTimeout(exploreTimer);
    explore = on;
    if (on) exploreTimer = window.setTimeout(() => (explore = false), 6000);
  }
  function toggleExplore() {
    if (explore || !hereDoors.length) return setExplore(false);
    const info = sceneInfo(route, here.path, view.orient);
    // some doors are off screen (zoomed in on a stop): step back to see the whole scene
    if (doorsInView(hereDoors, info.frame, cam, view.vp).length < hereDoors.length) go({ stop: null }, true);
    sfx.pop();
    setExplore(true);
  }
  // Into a layer from the peek panel: the tapped envelope grows into the dive's panel while the camera flies there.
  let grow = $state.raw<{ from: DOMRect; head: Node; sealed: boolean; path: string[] } | null>(null);
  let growEl = $state<HTMLDivElement>();
  function openLayer(path: string[], env: HTMLElement) {
    const head = env.querySelector('.env-head')?.cloneNode(true) ?? null, sealed = env.classList.contains('sealed');
    release(true);
    go({ path });
    grow = head && trans && !matchMedia('(prefers-reduced-motion: reduce)').matches ? { from: env.getBoundingClientRect(), head, sealed, path } : null;
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

  function pick(p: { places?: string[]; activity?: string }) {
    picker = null;
    if (p.activity && p.activity !== here.activity) go({ activity: p.activity, path: [] });
    else if (p.places) go({ places: p.places });
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
  const crumbs = $derived(here.path.map((_, i) => here.path.slice(0, i + 1)).reduce(
    (out, p) => [...out, { title: sceneTitle(route, p, view.orient), path: p }],
    [{ title: sceneTitle(route, [], view.orient), path: [] as string[] }],
  ));
  const placeName = $derived(route.slots.map((s) => tr(`place.${s.place}.name`)).join(' + '));

  // ------------------------------------------------------------------ frame loop, gestures, resize
  const orientFor = (w: number, h: number): Orient => (h > w * 1.1 ? 'portrait' : 'landscape');
  /** Keep the caught packet in the part of the screen the peek panel doesn't cover. */
  function trackCentre() {
    const c = areaCentre(view.vp), r = document.querySelector('.peek')?.getBoundingClientRect();
    if (!r) return c;
    if (view.orient === 'portrait') return { x: c.x, y: (view.vp.top + r.top) / 2 };
    return { x: r.left > view.vp.w / 2 ? r.left / 2 : (r.right + view.vp.w) / 2, y: c.y };
  }

  function resize() {
    const bar = document.querySelector('.chrome .controls')?.getBoundingClientRect();
    view.vp = viewportFor(stage, { top: bar ? bar.bottom + 8 : 0, bottom: captionEl ? captionEl.offsetHeight + 22 : 0 });
    const o = orientFor(view.vp.w, view.vp.h);
    if (o !== view.orient) { view.orient = o; prevIds = new Map(); }
    // the scenes are laid out anew: put a caught packet back at its hop (or let it go if this scene doesn't draw it)
    const spot = caught && spotAt(here.path, caught.hop, caught.dir);
    if (spot) { ghost = spot; glide = null; } else release(true);
    trans = null;
    flight = null;
    cam = target();
  }
  $effect(() => { const id = settings.style; untrack(() => { if (id !== themeState.current.id) void loadTheme(id).then(resize); }); });

  onMount(() => {
    const offNav = onNavigate(onNav);
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // pause freezes the traffic of path scenes; dives keep their own animations going
      const frozen = paused && stepInfo.kind === 'stop';
      timeScale += ((frozen ? 0 : 1) - timeScale) * Math.min(1, dt * 5);
      if (frozen && timeScale < 0.002) timeScale = 0;
      clock += dt * timeScale;
      view.real = now / 1000;
      view.time = clock;
      if (morph) frameMorph(now);
      framePackets(now);
      if (caught && track && !trans && ghost) {
        const p = packets.get(ghost.key)?.find((k) => k.id === CAUGHT_ID);
        if (p) {
          const info = sceneInfo(route, ghost.key ? ghost.key.split('/') : [], view.orient);
          const w = toRoot(info.frame, p.pose), k = fit(info.fit, view.vp).k * (view.orient === 'portrait' ? 1.6 : 1.8);
          const c = trackCentre(), a = 1 - Math.exp(-dt * 4);
          const tk = cam.k * Math.pow(k / cam.k, a);
          const cur = toWorldPt(cam, c.x, c.y);
          const wc = { x: cur.x + (w.x - cur.x) * a, y: cur.y + (w.y - cur.y) * a };
          cam = { k: tk, x: c.x - wc.x * tk, y: c.y - wc.y * tk };
        }
      }
      if (grow) frameGrow(now);
      if (trans) frameTrans(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const ctl = {
      stop() { trans = null; flight = null; },
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
    attachGestures(stage, ctl, {
      onTap, onFlick,
      onEnd() {
        const next = decide(cam, view.vp, route, here.path, view.orient);
        if (next) { gestureNav = true; go({ path: next }); }
        else settle();
      },
    });
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    const keys = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey || picker) return;
      if (e.key === 'Escape') up();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') step(1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') step(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', keys);
    // Test/screenshot hook (scripts/evaluate.mjs).
    Object.assign(window, {
      __app: {
        go, loc: () => nav.loc, busy: () => !!trans || !!morph || divesLoading(),
        /** Catch the youngest packet of a kind in the scene on screen; then `step` it (±1 hop). */
        catch: (kind = 'video') => catchKind(kind),
        step(d: -1 | 1) { if (caught) stepCaught(d); },
        caught: () => caught && { hop: route.chain[caught.hop].id, dir: caught.dir },
        release: () => release(),
        setClock(t: number) { clock = t; },
        /** Tap the magnifier of a layer's envelope in the peek panel (while a packet is caught). */
        openLayer(layer: string) {
          const b = document.querySelector<HTMLButtonElement>(`.peek .env-${layer} > .env-go`);
          b?.click();
          return !!b;
        },
        picker(open = true) { picker = open ? { slot: 0 } : null; },
        /** A door's badge on screen (in the current scene), e.g. to point the mouse at it. */
        doorAt(id: string) {
          const d = hereDoors.find((k) => k.id === id), info = sceneInfo(route, here.path, view.orient);
          if (!d) return null;
          const p = toScreen(cam, toRoot(info.frame, d.at)), r = stage.getBoundingClientRect();
          return [p.x + r.left, p.y + r.top];
        },
      },
    });
    return () => { offNav(); clearTimeout(exploreTimer); cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('keydown', keys); };
  });

  $effect(() => {
    const el = captionEl;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      captionH = el.offsetHeight;
      // the caption grew past the reserved inset (first measure, longer text): refit while idle
      if (!trans && !caught && Math.abs(view.vp.bottom - (captionH + 22)) > 30) resize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  });
  $effect(() => { document.documentElement.style.setProperty('--cap-h', `${captionH}px`); });
  const portrait = $derived(view.orient === 'portrait');
  const small = $derived(view.vp.w < 700);
  const peekOpen = $derived(!!caught);
</script>

<div id="stage" bind:this={stage} class={portrait ? 'port' : 'land'}>
  <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <A.Defs />
    <World {cam} {route} {mounted} {packets} scenes={morphScenes} places={morphPlaces} focus={{ key: hereKey, stop: here.stop, hot: chipHot ?? pointed, lit: explore }} />
    <A.Overlay w={view.vp.w} h={view.vp.h} time={view.time} />
  </svg>
</div>
<div class={portrait ? 'port' : 'land'}>
  <Chrome {crumbs} {small} wide={view.vp.w >= 1100} {explore} canExplore={hereDoors.length > 0} ontoggle={toggleExplore}
    {paused} onpause={stepInfo.kind === 'stop' ? togglePause : undefined} quiet={peekOpen} />
  {#if caught}
    <PeekPanel {route} flow={caught.flow} kind={caught.kind} dir={caught.dir} hop={caught.hop} onstep={stepCaught} onclose={() => release()} ondive={openLayer} />
  {/if}
  <!-- while a packet is caught, the peek panel's header takes over from the caption and the activity's crumb -->
  <Caption text={caption} place={placeName} onplace={() => (picker = { slot: 0 })} {explore} catches={catchable} oncatch={catchKind}
    ondoor={(id) => { const d = hereDoors.find((k) => k.id === id); if (d) openDoor(d); }} onhot={(id) => (chipHot = id)} hidden={!showCaption || peekOpen} bind:el={captionEl} />
  {#if !peekOpen}
    <StepButtons {portrait} layer={stepInfo.kind === 'layer'} canPrev={stepInfo.i > stepInfo.min} canNext={stepInfo.i < stepInfo.steps.length - 1} onstep={step} {nudge} />
  {/if}
  {#if grow}<div class="env grow" class:sealed={grow.sealed} bind:this={growEl} aria-hidden="true"></div>{/if}
  {#if picker}
    <PlacePicker places={here.places} activity={here.activity} slot={picker.slot} onpick={pick} onclose={() => (picker = null)} />
  {/if}
</div>
