<script lang="ts">
  // The list view (issue #53): every scene of the route as text, nested as the scene tree is (model/textmap), for the
  // keyboard, screen readers, print and anyone who'd rather read. Each scene has a heading (deeper scenes, deeper
  // headings), what its picture shows (`describe`) and its caption's text; a path scene lists its stops in stepping
  // order, each with its text and the scenes it opens. Where you are and the caught packet's hop are marked. A dialog
  // over the app (inert meanwhile): it opens at where you are, and Esc or × closes it.
  import { onMount } from 'svelte';
  import type { Loc } from '../model/location';
  import type { Route } from '../model/resolve';
  import { mapOf, type MapScene, type MapStop } from '../model/textmap';
  import { tr, view } from '../state.svelte';
  import { captionFor } from './caption';
  import Icon from './Icon.svelte';

  let { route, here, caught, onclose, ongo, onswap }: {
    route: Route; here: Loc;
    /** The hop the caught packet waits at (its id), if one is caught. */
    caught: string | null;
    onclose: () => void;
    /** Go to a scene, or a stop in it. */
    ongo: (path: string[], stop: string | null) => void;
    /** Change where you are (the start device's door). */
    onswap: () => void;
  } = $props();
  const map = $derived(mapOf(route, view.orient));
  const key = (path: string[]) => path.join('/');
  const isHere = (path: string[], stop: string | null) => key(path) === key(here.path) && stop === here.stop;
  /** How a scene's parent opens it. */
  const verb = (s: MapScene) => (s.via === null ? 'map.go' : s.via === 'expand' ? 'door.expand' : 'door.dive');
  let box: HTMLDivElement;
  onMount(() => {
    const at = box.querySelector<HTMLElement>('[data-here]');
    at?.scrollIntoView({ block: 'center' });
    at?.focus({ preventScroll: true });
  });
</script>

{#snippet scene(s: MapScene, depth: number)}
  {@const c = captionFor(route, s.path, null, view.orient)}
  {@const at = isHere(s.path, null)}
  <div class="map-scene" class:here={at}>
    <!-- a heading by role, its level the scene's depth (<svelte:element> would add 2 kB to the start) -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (-1: where the list opens, focused from code) -->
    <p class="map-h" class:top={depth === 3} role="heading" aria-level={Math.min(6, depth)} tabindex={at ? -1 : undefined} data-here={at || undefined}
      aria-current={at ? 'location' : undefined}>
      {c.title}{#if at}<span class="map-mark">{tr('map.here')}</span>{/if}
    </p>
    {#if c.tag}<p class="map-tag">{c.tag}</p>{/if}
    {#if c.describe}<p>{c.describe}</p>{/if}
    <p>{c.body}</p>
    <button class="btn" aria-label="{tr(verb(s))}: {c.title}" onclick={() => ongo(s.path, null)}>
      {#if s.via}<Icon name={s.via === 'expand' ? 'open' : 'look'} />{/if}{tr(verb(s))}
    </button>
    {#if s.stops.length}
      <ol class="map-stops">
        {#each s.stops as st (st.spot.stop)}{@render stop(s, st, depth)}{/each}
      </ol>
    {/if}
  </div>
{/snippet}

{#snippet stop(s: MapScene, st: MapStop, depth: number)}
  {@const c = captionFor(route, s.path, st.spot.stop, view.orient)}
  {@const at = isHere(s.path, st.spot.stop)}
  <li class:here={at} aria-current={at ? 'location' : undefined}>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (-1: where the list opens, focused from code) -->
    <p class="map-stop" tabindex={at ? -1 : undefined} data-here={at || undefined}>
      <b>{c.title}</b>{#if at}<span class="map-mark">{tr('map.here')}</span>{/if}{#if caught === st.spot.stop}<span class="map-mark">{tr('map.caught')}</span>{/if}
    </p>
    {#if c.tag}<p class="map-tag">{c.tag}</p>{/if}
    <p>{c.body}</p>
    <button class="btn" aria-label="{tr('map.go')}: {c.title}" onclick={() => ongo(s.path, st.spot.stop)}>{tr('map.go')}</button>
    {#if st.spot.doors.some((d) => d.kind === 'swap')}
      <button class="btn" aria-label="{tr('door.swap')}: {tr('pick.where')}" onclick={onswap}>{tr('door.swap')}</button>
    {/if}
    {#each st.scenes as child (key(child.path))}{@render scene(child, depth + 1)}{/each}
  </li>
{/snippet}

<svelte:window onkeydown={(e) => e.key === 'Escape' && (onclose(), e.stopPropagation())} />
<div class="map-back" data-ui onclick={onclose} role="presentation"></div>
<div class="map card" data-ui role="dialog" aria-modal="true" aria-labelledby="map-title">
  <header>
    <h2 id="map-title">{tr('map.title')}</h2>
    <button class="btn" onclick={() => print()}>{tr('map.print')}</button>
    <button class="btn" onclick={onclose} aria-label={tr('ui.close')}><Icon name="close" /></button>
  </header>
  <div class="map-body" bind:this={box}>{@render scene(map, 3)}</div>
</div>
