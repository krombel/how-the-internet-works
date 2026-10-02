<script lang="ts">
  // First-run coach marks (issue #21; coach.ts, coach-marks.ts): a card pointing at the scene's first "Open up", then
  // its first "Look inside", then "What can I explore?". Meanwhile the app lights the doors as "What can I explore?"
  // does, makes the pointed-at one hot and pauses the scene (all three are App's). It doesn't block anything: a tap
  // anywhere but its buttons ends it and still does what it would have done (the stage has hit-tested the tap before
  // it gets here); so do Esc and going anywhere (App). Not a dialog: it takes no focus and traps none; it comes after
  // the skip link in the Tab order, and the announcer (and read aloud, when it's on) says each card.
  import { untrack } from 'svelte';
  import type { Rect } from '../engine/geometry';
  import type { Door } from '../model/doors';
  import { fill, nav, readAloud, routeKeys, tr, trFirst, view } from '../state.svelte';
  import { announce } from './announce.svelte';
  import { coachMarks, placeMark } from './coach-marks';

  let { doors, canExplore, wide, rectOf, onhot, onend }: {
    /** The scene's doors, and whether "What can I explore?" is offered (with its long label: `wide`). */
    doors: Door[]; canExplore: boolean; wide: boolean;
    /** A door's badge on screen. */
    rectOf: (d: Door) => Rect | null;
    /** The door pointed at (it glows), or null. */
    onhot: (id: string | null) => void;
    onend: () => void;
  } = $props();

  const marks = untrack(() => coachMarks(doors, canExplore));
  let i = $state(0), w = $state(0), h = $state(0);
  const mark = $derived(marks[i]);
  const last = $derived(i === marks.length - 1);
  // what opens up may say what's inside it (the group's `inside.coach`, which the route's places may override)
  const text = $derived.by(() => {
    if (!mark) return '';
    if (mark.kind === 'explore') return fill(tr('coach.explore'), { button: tr(wide ? 'explore.title' : 'explore.short') });
    const g = nav.route.hops[mark.door.id];
    return mark.kind === 'expand' && g ? trFirst([...routeKeys(`inside.${g.id}.coach`), `node.${g.node.id}.inside.coach`, 'coach.expand']) : tr(`coach.${mark.kind}`);
  });
  const count = $derived(fill(tr('coach.count'), { n: i + 1, of: marks.length }));
  // the explore button is in the chrome: measured again when the window changes
  const target = $derived.by(() => {
    if (!mark) return null;
    if (mark.door) return rectOf(mark.door);
    void view.vp;
    const r = document.querySelector('.explore-btn')?.getBoundingClientRect();
    return r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
  });
  const at = $derived(target && w && h ? placeMark(target, { w, h }, view.vp) : null);
  // it glides from mark to mark, but not into its first place: from the corner it waits in unplaced, it would sweep
  // across the scene, and a tap on a door it passes would land on it (#87)
  let shown = $state(false);

  $effect(() => { if (!mark) onend(); });
  $effect(() => onhot(mark?.door?.id ?? null));
  $effect(() => {
    if (!text) return;
    const said = i === 0 ? `${tr('coach.label')}. ${count}. ${text}` : `${count}. ${text}`;
    untrack(() => { announce(said); readAloud(text); });
  });

  function next() {
    if (last) onend();
    else i++;
  }
  // a tap anywhere but the card's buttons ends it (after the stage has taken the tap: this is the bubbling phase)
  function onpointerup(e: PointerEvent) {
    if (!(e.target as Element).closest?.('.coach button')) onend();
  }
</script>

<svelte:window {onpointerup} />
{#if mark}
  <aside class="coach card {at?.side ?? ''}" class:placed={!!at} class:shown aria-label={tr('coach.label')} data-ui bind:offsetWidth={w} bind:offsetHeight={h}
    onanimationend={() => (shown = true)}
    style:left="{at?.x ?? 0}px" style:top="{at?.y ?? 0}px" style:--tail="{at?.tail ?? 0}px">
    <p dir="auto">{text}</p>
    <div class="coach-foot">
      <span class="coach-count">{count}</span>
      <button class="btn coach-skip" onclick={onend}>{tr('coach.skip')}</button>
      <button class="btn coach-next" onclick={next}>{tr(last ? 'coach.done' : 'coach.next')}</button>
    </div>
  </aside>
{/if}

<style>
  /* above the top bar and the caption (10), under a pop-up (20) and the skip link (40); opaque, like an open caption */
  .coach { position: fixed; z-index: 15; width: min(320px, calc(100vw - 20px)); padding: 12px 14px 10px; visibility: hidden;
    background: linear-gradient(var(--card), var(--card)), var(--bg); color: var(--ink); }
  .coach.placed { visibility: visible; animation: coach-in 0.25s ease-out both; }
  .coach.placed.shown { transition: left 0.3s ease, top 0.3s ease; }
  .coach p { margin: 0 0 8px; font-size: 16px; font-weight: 700; line-height: 1.35; }
  .coach-foot { display: flex; align-items: center; gap: 8px; }
  .coach-count { flex: 1; color: var(--muted); font-size: 13px; font-weight: 700; }
  .coach-next { background: var(--btn-on); color: var(--btn-on-ink); }
  /* the tail: a square turned 45°, only its outer half shown, with the card's edge on its two outer sides */
  .coach::before { content: ''; position: absolute; width: 18px; height: 18px; background: inherit;
    border: var(--card-edge-w) solid var(--card-edge); border-left: 0; border-bottom: 0; clip-path: polygon(0 0, 100% 0, 100% 100%); }
  .coach.below::before { top: -9px; left: calc(var(--tail) - 9px); rotate: -45deg; }
  .coach.above::before { bottom: -9px; left: calc(var(--tail) - 9px); rotate: 135deg; }
  .coach.right::before { left: -9px; top: calc(var(--tail) - 9px); rotate: -135deg; }
  .coach.left::before { right: -9px; top: calc(var(--tail) - 9px); rotate: 45deg; }
  @keyframes coach-in { from { opacity: 0; scale: 0.96; } }
  @media (prefers-reduced-motion: reduce) { .coach.placed { animation: none; } .coach.placed.shown { transition: none; } }
</style>
