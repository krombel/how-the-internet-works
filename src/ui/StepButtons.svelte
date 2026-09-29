<script lang="ts">
  // Big ◀ ▶ buttons for walking sideways along the path (portrait: ▼ ▲, since the path runs upwards). In a layer dive
  // they go down and up the layers of the hop: ▼ ▲ everywhere.
  import { tr } from '../state.svelte';
  import Icon from './Icon.svelte';
  let { portrait, layer, canPrev, canNext, onstep, nudge }: {
    portrait: boolean; layer: boolean; canPrev: boolean; canNext: boolean; onstep: (d: -1 | 1) => void; nudge: { dir: number; n: number };
  } = $props();
  const vertical = $derived(portrait || layer);
  // Diagrams are not mirrored in RTL, so the arrows point where the camera goes: "next" is always to the right/up.
  const rot = (d: -1 | 1) => (vertical ? (d > 0 ? -90 : 90) : d > 0 ? 0 : 180);
  const label = (d: -1 | 1) => tr(layer ? (d < 0 ? 'nav.below' : 'nav.above') : d < 0 ? 'nav.prev' : 'nav.next');
</script>

{#each [-1, 1] as const as d}
  {#key nudge.dir === d ? nudge.n : 0}
    <button class="step card btn {d < 0 ? 'prev' : 'next'}" class:nudge={nudge.dir === d && nudge.n > 0} data-ui
      style:--nx="{vertical ? 0 : d * 6}px" style:--ny="{vertical ? -d * 6 : 0}px"
      aria-label={label(d)} onclick={() => onstep(d)} aria-disabled={d < 0 ? !canPrev : !canNext}>
      <Icon name="chevron" rotate={rot(d)} />
    </button>
  {/key}
{/each}
