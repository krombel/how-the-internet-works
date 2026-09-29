<script lang="ts">
  // Orchestration: one rAF loop drives the scene clock, packets, the camera (eased zoom flights, follow) and the morph
  // between places. Everything is generic over the scene tree; scenes and art only render what this computes.
  import { onMount, untrack } from 'svelte';
  import { areaCentre, clampCam, fit, flyInterpolator, toScreen, toWorldPt, viewportFor, zoomAbout, type Cam } from './engine/camera';
  import { bezier, type Curve, type Orient, type Pt } from './engine/geometry';
  import { attachGestures } from './engine/gestures';
  import { easeInOutCubic } from './engine/motion';
  import { livePackets, specsFor, type LivePacket } from './engine/packets';
  import { sfx } from './engine/sound';
  import { camFor, decide, keyOf, kLimits, mixes, sceneInfo } from './engine/zoom';
  import { morphScene, pathScene, startNode, type PathScene } from './model/layout';
  import type { Loc } from './model/location';
  import type { Route } from './model/resolve';
  import { childrenOf, parentPath, rectToRoot, sceneRef, stopRectLocal, toLocal, toRoot, validPrefix } from './model/tree';
  import type { Mounted } from './render/ctx';
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
  function onNav(next: Loc, prev: Loc) {
    const a = shownRoute;
    shownRoute = nav.route;
    const switched = a !== nav.route;
    if (!switched && keyOf(next.path) === keyOf(prev.path) && next.stop === prev.stop) return;
    if (follow) endFollow(false, true);
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

  // Sideways stepping: path scenes step through their stops; at dive level, between the parent's dives.
  let nudge = $state({ dir: 0, n: 0 });
  const stepInfo = $derived.by(() => {
    const o = view.orient, ref = sceneInfo(route, here.path, o).ref;
    if (ref.kind === 'path') {
      const stops = pathScene(route, ref.group, o).stops;
      return { dive: false, stops, i: here.stop ? stops.indexOf(here.stop) : -1, min: -1 };
    }
    const parent = parentPath(here.path);
    const stops = childrenOf(route, sceneInfo(route, parent, o).ref, o).filter((c) => c.kind === 'dive').map((c) => c.step);
    return { dive: true, stops, i: stops.indexOf(here.path[here.path.length - 1]), min: 0 };
  });
  function step(d: -1 | 1) {
    if (follow) endFollow(false);
    const { stops, i, min, dive } = stepInfo, ni = i + d;
    if (ni < min || ni >= stops.length) { sfx.bump(); nudge = { dir: d, n: nudge.n + 1 }; return; }
    if (dive) go({ path: [...parentPath(here.path), stops[ni]] });
    else go({ stop: ni < 0 ? null : stops[ni] }, true);
  }
  function up() {
    if (picker) return (picker = null);
    if (follow) return endFollow(false);
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

  // ------------------------------------------------------------------ packets + follow
  let packets = $state.raw(new Map<string, LivePacket[]>());
  let prevIds = new Map<string, Map<string, LivePacket>>();
  let follow = $state.raw<{ id: string; key: string } | null>(null);
  let followed = $state.raw<LivePacket | null>(null);
  let timeScale = 1, clock = 0;
  const FOLLOW_SCALE = 0.3;

  function startFollow(p: LivePacket, key: string) {
    follow = { id: p.id, key };
    view.followId = p.id;
    followed = p;
    trans = null;
    flight = null;
    sfx.pop();
  }
  function endFollow(arrived: boolean, silent = false) {
    if (!follow) return;
    if (arrived && followed) sfx.blip(true, followed.dir);
    follow = null; followed = null; view.followId = null;
    if (!silent) startTrans(here.path, here.path, target(), 800);
  }

  function framePackets() {
    const next = new Map<string, LivePacket[]>(), o = view.orient;
    for (const m of mounted) {
      if (m.alpha <= 0.002) continue;
      const ref = sceneInfo(route, m.path, o).ref;
      if (ref.kind !== 'path') continue;
      const own = pathScene(route, ref.group, o), shown = morphScenes.get(m.key) ?? own;
      const list = livePackets(specsFor(own, route.activity.flows), shown.links, view.time, m.key);
      const ids = new Map(list.map((p) => [p.id, p]));
      for (const [id, p] of prevIds.get(m.key) ?? []) {
        if (ids.has(id)) continue;
        if (follow?.id === id) endFollow(true);
        else if (m.key === hereKey && p.age > p.spec.duration * 0.85) sfx.blip(false, p.dir);
      }
      prevIds.set(m.key, ids);
      next.set(m.key, list);
    }
    packets = next;
  }

  // ------------------------------------------------------------------ taps
  const nearLink = (l: Curve, p: Pt) => {
    let best = Infinity;
    for (let i = 0; i <= 24; i++) { const b = bezier(l, i / 24); best = Math.min(best, Math.hypot(b.x - p.x, b.y - p.y)); }
    return best;
  };
  let picker = $state<{ slot: number } | null>(null);
  function onTap(sx: number, sy: number) {
    const o = view.orient, info = sceneInfo(route, here.path, o);
    if (info.ref.kind === 'path') {
      // packets: a generous ≥ 30 px screen radius, for small fingers
      let hit: { p: LivePacket; d: number } | null = null;
      for (const p of packets.get(hereKey) ?? []) {
        const s = toScreen(cam, toRoot(info.frame, p.pose)), d = Math.hypot(s.x - sx, s.y - sy);
        if (d < 32 && (!hit || d < hit.d)) hit = { p, d };
      }
      if (hit) return startFollow(hit.p, hereKey);
    }
    if (follow) return endFollow(false);
    if (info.ref.kind !== 'path') return;
    const ps = morphScenes.get(hereKey) ?? pathScene(route, info.ref.group, o), sk = cam.k * info.frame.s;
    const w = toLocal(info.frame, toWorldPt(cam, sx, sy)), minR = 30 / sk;
    const start = here.path.length ? null : startNode(ps);
    if (start && Math.hypot(start.x + start.size * 0.36 - w.x, start.y - start.size * 0.36 - w.y) < Math.max(34, minR)) {
      sfx.pop();
      picker = { slot: start.hop.slot ?? 0 };
      return;
    }
    for (const l of ps.links) if (l.dive && nearLink(l, w) < Math.max(46, minR)) { sfx.pop(); return go({ path: [...here.path, l.id] }); }
    for (const n of ps.nodes) {
      if (Math.hypot(n.x - w.x, n.y - w.y) > Math.max(n.size * 0.55, minR)) continue;
      sfx.pop();
      if (n.kind === 'group') return go({ path: [...here.path, n.id] });
      if (n.kind === 'entry') return go({ path: parentPath(here.path), stop: n.hop.id });
      if (ps.stops.includes(n.id)) return go({ stop: here.stop === n.id ? null : n.id }, true);
    }
    for (const l of ps.links) if (ps.stops.includes(l.id) && nearLink(l, w) < Math.max(40, minR)) { sfx.pop(); return go({ stop: l.id }, true); }
    if (here.stop) go({ stop: null }, true);
  }
  function pick(p: { places?: string[]; activity?: string }) {
    picker = null;
    if (p.activity && p.activity !== here.activity) go({ activity: p.activity, path: [] });
    else if (p.places) go({ places: p.places });
  }

  function onFlick(dx: number, dy: number) {
    const portrait = view.orient === 'portrait';
    if (Math.abs(dx) > Math.abs(dy) * 1.2) { step(dx < 0 ? 1 : -1); return true; }
    if (portrait && Math.abs(dy) > Math.abs(dx) * 1.2) { step(dy > 0 ? 1 : -1); return true; }
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
  /** Keep the followed packet in the part of the screen the peek panel doesn't cover. */
  function followCentre() {
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
    if (follow) endFollow(false, true);
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
      timeScale += ((follow ? FOLLOW_SCALE : 1) - timeScale) * Math.min(1, dt * 5);
      clock += dt * timeScale;
      view.real = now / 1000;
      view.time = clock;
      if (morph) frameMorph(now);
      framePackets();
      if (follow) {
        const p = packets.get(follow.key)?.find((k) => k.id === follow!.id);
        if (p) {
          followed = p;
          const info = sceneInfo(route, follow.key ? follow.key.split('/') : [], view.orient);
          const w = toRoot(info.frame, p.pose), k = fit(info.fit, view.vp).k * (view.orient === 'portrait' ? 1.6 : 1.8);
          const c = followCentre(), a = 1 - Math.exp(-dt * 4);
          const tk = cam.k * Math.pow(k / cam.k, a);
          const cur = toWorldPt(cam, c.x, c.y);
          const wc = { x: cur.x + (w.x - cur.x) * a, y: cur.y + (w.y - cur.y) * a };
          cam = { k: tk, x: c.x - wc.x * tk, y: c.y - wc.y * tk };
        }
      }
      if (trans) frameTrans(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const ctl = {
      stop() { trans = null; flight = null; },
      zoomAt(f: number, sx: number, sy: number) {
        if (follow) endFollow(false, true);
        const lim = kLimits(route, here.path, view.vp, view.orient);
        const k = clampCam({ ...cam, k: cam.k * f }, view.vp, lim.min, lim.max).k;
        cam = zoomAbout(cam, k / cam.k, sx, sy);
      },
      panBy(dx: number, dy: number) {
        if (follow) endFollow(false, true);
        cam = { ...cam, x: cam.x + dx, y: cam.y + dy };
      },
    };
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
        go, loc: () => nav.loc, busy: () => !!trans || !!morph,
        follow(kind = 'video') {
          const list = packets.get(hereKey) ?? [];
          const p = list.filter((k) => k.kind === kind).sort((x, y) => x.age / x.spec.duration - y.age / y.spec.duration)[0] ?? list[0];
          if (p) startFollow(p, hereKey);
          return !!p;
        },
        setClock(t: number) { clock = t; },
        picker(open = true) { picker = open ? { slot: 0 } : null; },
      },
    });
    return () => { offNav(); cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('keydown', keys); };
  });

  $effect(() => {
    const el = captionEl;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      captionH = el.offsetHeight;
      // the caption grew past the reserved inset (first measure, longer text): refit while idle
      if (!trans && !follow && Math.abs(view.vp.bottom - (captionH + 22)) > 30) resize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  });
  $effect(() => { document.documentElement.style.setProperty('--cap-h', `${captionH}px`); });
  const portrait = $derived(view.orient === 'portrait');
  const small = $derived(view.vp.w < 700);
  const peekOpen = $derived(!!followed);
</script>

<div id="stage" bind:this={stage} class={portrait ? 'port' : 'land'}>
  <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <A.Defs />
    <World {cam} {route} {mounted} {packets} scenes={morphScenes} places={morphPlaces} focus={{ key: hereKey, stop: here.stop }} />
    <A.Overlay w={view.vp.w} h={view.vp.h} time={view.time} />
  </svg>
</div>
<div class={portrait ? 'port' : 'land'}>
  <Chrome {crumbs} {small} />
  {#if followed}
    <PeekPanel packet={followed} {route} onclose={() => endFollow(false)} />
  {/if}
  <Caption text={caption} place={placeName} onplace={() => (picker = { slot: 0 })} hidden={!showCaption || (peekOpen && portrait)} bind:el={captionEl} />
  {#if !(peekOpen && portrait)}
    <StepButtons {portrait} canPrev={stepInfo.i > stepInfo.min} canNext={stepInfo.i < stepInfo.stops.length - 1} onstep={step} {nudge} />
  {/if}
  {#if picker}
    <PlacePicker places={here.places} activity={here.activity} slot={picker.slot} onpick={pick} onclose={() => (picker = null)} />
  {/if}
</div>
