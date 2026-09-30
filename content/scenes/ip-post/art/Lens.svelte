<svelte:options namespace="svg" />
<script lang="ts">
  // The hop's magnifying glass, sweeping over the address label while it reads it.
  import type { LensProps } from '../types';
  let { x, y, r, time }: LensProps = $props();
  const dx = $derived(Math.sin(time * 5) * r * 0.35);
</script>

<g transform="translate({x + dx} {y})">
  <path d={`M${r * 0.7} ${r * 0.7} L${r * 1.6} ${r * 1.6}`} stroke="var(--line)" stroke-width="16" stroke-linecap="round" />
  <path d={`M${r * 0.7} ${r * 0.7} L${r * 1.6} ${r * 1.6}`} stroke="var(--mustard)" stroke-width="8" stroke-linecap="round" />
  <circle r={r} fill="var(--paper)" fill-opacity="0.35" stroke="var(--line)" stroke-width="8" />
  <path d={`M${-r * 0.55} ${-r * 0.2} A${r * 0.6} ${r * 0.6} 0 0 1 ${-r * 0.15} ${-r * 0.58}`} fill="none" stroke="var(--paper)" stroke-width="6" stroke-linecap="round" />
</g>
