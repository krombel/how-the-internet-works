<script lang="ts">
  // The scene's keys (issue #53): a real button over every spot of the scene (model/focus), in one layer that moves
  // with the camera, so the keyboard, a screen reader's touch exploration, Voice Control and switch access all reach
  // the picture itself. One Tab stop: a roving tabindex on where you are, and focus follows where you are (and where
  // you are follows focus). The arrow keys step and Esc goes up (App's keys); Home and End go to the first and last
  // stop; Enter or Space opens the spot's door. They take no pointer events, so taps still hit-test the picture. While
  // the keyboard is in here (`:focus-visible`) the theme rings the stop (`kbd`) and its door shows its label.
  import { untrack } from 'svelte';
  import type { Cam } from '../engine/camera';
  import { sceneInfo } from '../engine/zoom';
  import type { Door } from '../model/doors';
  import { spotsOf, type Spot } from '../model/focus';
  import type { Route } from '../model/resolve';
  import { go } from '../router';
  import { fill, tr, trCount, view } from '../state.svelte';
  import { captionFor, sceneTitle } from './caption';

  let { route, path, stop, cam, vertical, hidden, onopen, onhot, onkbd }: {
    route: Route; path: string[]; stop: string | null; cam: Cam;
    /** Stepping goes up and down (a portrait path, the layers of a hop). */
    vertical: boolean;
    /** Out of reach (a packet is caught: the peek panel has the keys). */
    hidden: boolean;
    onopen: (d: Door) => void;
    /** The door of the focused spot (its label shows), or null. */
    onhot: (id: string | null) => void;
    /** Whether focus is in here (the scene draws the ring). */
    onkbd: (on: boolean) => void;
  } = $props();

  let el: HTMLDivElement;
  const frame = $derived(sceneInfo(route, path, view.orient).frame);
  const spots = $derived(spotsOf(route, path, view.orient));
  const n = $derived(spots.length - 1);
  const current = $derived(spots.some((s) => s.stop === stop) ? stop : null);
  const names = $derived(spots.map((s, i) => {
    const title = sceneTitle(route, path, view.orient);
    if (!s.stop) return n ? `${title}, ${trCount('keys.stops', n)}` : title;
    const parts = [captionFor(route, path, s.stop, view.orient).title, fill(tr('peek.hop'), { n: i, of: n })];
    if (s.primary) parts.push(tr(`keys.${s.primary.kind}`));
    return parts.join(', ');
  }));
  // the camera, as SceneView draws the scene (one style write a frame); --px keeps the whole scene's ring 3 px on screen
  const k = $derived(cam.k * frame.s);
  const matrix = $derived(`matrix(${k}, 0, 0, ${k}, ${cam.x + frame.x * cam.k}, ${cam.y + frame.y * cam.k})`);

  let inside = false;
  function onfocusout(e: FocusEvent) {
    if (el.contains(e.relatedTarget as Node | null)) return;
    inside = false;
    onkbd(false);
    onhot(null);
  }
  function onfocus(s: Spot, e: FocusEvent) {
    inside = true;
    // the ring and the door's label are for the keyboard, not for focus that only landed here after a tap
    const shown = (e.currentTarget as Element).matches(':focus-visible');
    onkbd(shown);
    onhot(shown ? (s.primary?.id ?? null) : null);
    if (s.stop !== current) go({ stop: s.stop }, true);
  }
  function onkeydown(e: KeyboardEvent) {
    if ((e.key !== 'Home' && e.key !== 'End') || !n) return;
    e.preventDefault();
    go({ stop: spots[e.key === 'Home' ? 1 : n].stop }, true);
  }
  // focus follows where you are (stepping, a door, the button it was on going away with its scene)
  $effect(() => {
    void current;
    void spots;
    untrack(() => {
      const b = el.querySelector<HTMLElement>('[tabindex="0"]');
      if (inside && b && document.activeElement !== b) b.focus({ preventScroll: true });
    });
  });
</script>

<div class="scene-keys" inert={hidden}>
  <div class="scene-keys-in" role="toolbar" aria-label={tr('keys.label')} aria-orientation={vertical ? 'vertical' : 'horizontal'}
    bind:this={el} style:transform={matrix} style:--px={1 / k} {onfocusout}>
    {#each spots as s, i (s.stop ?? '')}
      <button class="scene-key" data-kind={s.kind} tabindex={s.stop === current ? 0 : -1} aria-label={names[i]}
        style:left="{s.rect.x}px" style:top="{s.rect.y}px" style:width="{s.rect.w}px" style:height="{s.rect.h}px"
        onfocus={(e) => onfocus(s, e)} {onkeydown} onclick={() => s.primary && onopen(s.primary)}></button>
    {/each}
  </div>
</div>
