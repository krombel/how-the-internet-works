<svelte:options namespace="svg" />
<script lang="ts">
  // Another network's router at the exchange: a box with its colour on top.
  import type { MemberProps } from '../types';
  let { box, colour, night }: MemberProps = $props();
  const { x, y, w, h } = $derived(box);
</script>

{#if night}<rect x={x - 12} y={y - 12} width={w + 24} height={h + 24} rx="24" fill={colour} opacity="0.12" />{/if}
<rect x={x + 7} y={y + 9} width={w} height={h} rx="20" fill="var(--shade)" opacity="0.13" />
<rect {x} {y} width={w} height={h} rx="20" fill="var(--paper)" stroke="var(--line)" stroke-width="5" />
<path d={`M${x + 5} ${y + 22} Q${x + 5} ${y + 5} ${x + 22} ${y + 5} H${x + w - 22} Q${x + w - 5} ${y + 5} ${x + w - 5} ${y + 22} V${y + h * 0.42} H${x + 5} Z`} fill={colour} opacity="0.86" />
{#each [0, 1] as r (r)}
  <path d={`M${x + 24} ${y + h * 0.6 + r * 18} H${x + w - 24}`} stroke="var(--line)" stroke-width="5" stroke-linecap="round" opacity="0.75" />
{/each}
