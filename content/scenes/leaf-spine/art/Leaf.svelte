<svelte:options namespace="svg" />
<script lang="ts">
  import type { LeafProps } from '../types';
  let { box, active = false, night }: LeafProps = $props();
  const { x, y, w, h } = $derived(box);
</script>

{#if night && active}<rect x={x - 14} y={y - 14} width={w + 28} height={h + 28} rx="24" fill="var(--teal)" opacity="0.16" />{/if}
<rect x={x + 7} y={y + 9} width={w} height={h} rx="20" fill="var(--shade)" opacity="0.12" />
<rect {x} {y} width={w} height={h} rx="20" fill="var(--paper)" stroke="var(--line)" stroke-width="6" />
<path d={`M${x + 5} ${y + 23} Q${x + 5} ${y + 5} ${x + 23} ${y + 5} H${x + w - 23} Q${x + w - 5} ${y + 5} ${x + w - 5} ${y + 23} V${y + h * 0.38} H${x + 5} Z`} fill={active ? 'var(--orange)' : 'var(--leaf)'} opacity="0.88" />
{#each [0, 1, 2] as r (r)}
  <path d={`M${x + 24} ${y + h * 0.52 + r * 20} H${x + w - 24}`} stroke="var(--line)" stroke-width="5" stroke-linecap="round" opacity="0.74" />
{/each}
