<svelte:options namespace="svg" />
<script lang="ts">
  // The network card: its socket in the colour of the link it's on, an arrow in, and the lights.
  import type { Pt } from '../types';
  let { p, colour }: { p: Pt; colour: string } = $props();
</script>

<rect x={p.x - 62} y={p.y - 36} width="124" height="72" rx="14" fill="var(--teal)" stroke="var(--line)" stroke-width="6" />
<circle cx={p.x - 32} cy={p.y} r="17" fill={colour} stroke="var(--line)" stroke-width="4" />
<path d={`M${p.x - 2} ${p.y} H${p.x + 42} m-12 -12 l12 12 l-12 12`} fill="none" stroke="var(--line)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
{#each [0, 1, 2, 3] as k (k)}
  <circle cx={p.x + 55 + k * 18} cy={p.y - 24 + (k % 2) * 48} r="6" fill="var(--sun)" stroke="var(--line)" stroke-width="2" />
{/each}
