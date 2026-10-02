<svelte:options namespace="svg" />
<script lang="ts">
  // A chunk of video: a berry film box with sprocket holes and a paper label (its number is drawn over the label by
  // the scene, so it keeps to the label minimum). 144 × 96 at scale 1.
  let { x, y, scale = 1, glow = false }: { x: number; y: number; scale?: number; glow?: boolean } = $props();
  const holes = [-54, -30, -6, 18, 42];
</script>

<g transform="translate({x} {y}) scale({scale})">
  {#if glow}<rect x="-90" y="-66" width="180" height="132" rx="34" fill="var(--glow-box)" stroke="var(--mustard)" stroke-width="6" />{/if}
  <rect x="-72" y="-48" width="144" height="96" rx="16" fill="var(--berry)" stroke="var(--line)" stroke-width="6" />
  {#each holes as h}
    <rect x={h} y="-40" width="12" height="10" rx="3" fill="var(--paper)" />
    <rect x={h} y="30" width="12" height="10" rx="3" fill="var(--paper)" />
  {/each}
  <rect x="-46" y="-22" width="92" height="44" rx="10" fill="var(--paper)" stroke="var(--line)" stroke-width="4" />
</g>
