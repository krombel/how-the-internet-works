<svelte:options namespace="svg" />
<script lang="ts">
  import type { SliceProps } from '../types';
  let { x, y, r, colours }: SliceProps = $props();
  // the steel wires of the armour, round the outside
  const wires = $derived(Array.from({ length: 18 }, (_, i) => ({ x: x + Math.cos((i / 18) * 2 * Math.PI) * r * 0.86, y: y + Math.sin((i / 18) * 2 * Math.PI) * r * 0.86 })));
  const glass = $derived(colours.map((c, i) => ({ c, x: x + Math.cos((i / colours.length) * 2 * Math.PI + 0.4) * r * 0.16, y: y + Math.sin((i / colours.length) * 2 * Math.PI + 0.4) * r * 0.16 })));
</script>

<g class="slice">
  <circle cx={x} cy={y} r={r} fill="var(--stone)" stroke="var(--line)" stroke-width="6" />
  {#each wires as w}<circle cx={w.x} cy={w.y} r={r * 0.11} fill="var(--paper-2)" stroke="var(--line)" stroke-width="3" />{/each}
  <circle cx={x} cy={y} r={r * 0.66} fill="var(--paper-2)" stroke="var(--line)" stroke-width="4" />
  <circle cx={x} cy={y} r={r * 0.46} fill="var(--mustard)" stroke="var(--line)" stroke-width="4" />
  <circle cx={x} cy={y} r={r * 0.32} fill="var(--glass)" stroke="var(--line)" stroke-width="4" />
  {#each glass as g}<circle cx={g.x} cy={g.y} r={r * 0.07} fill={g.c} stroke="var(--line)" stroke-width="2" />{/each}
</g>
