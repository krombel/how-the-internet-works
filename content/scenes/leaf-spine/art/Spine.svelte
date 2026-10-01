<svelte:options namespace="svg" />
<script lang="ts">
  import type { SpineProps } from '../types';
  let { box, active, night }: SpineProps = $props();
  const { x, y, w, h } = $derived(box);
</script>

{#if night && active}<rect x={x - 16} y={y - 16} width={w + 32} height={h + 32} rx="26" fill="var(--sun)" opacity="0.18" />{/if}
<rect x={x + 8} y={y + 10} width={w} height={h} rx="22" fill="var(--shade)" opacity="0.14" />
<rect {x} {y} width={w} height={h} rx="22" fill={active ? 'var(--kraft)' : 'var(--paper)'} stroke="var(--line)" stroke-width={active ? 8 : 6} />
<path d={`M${x + 5} ${y + 24} Q${x + 5} ${y + 5} ${x + 24} ${y + 5} H${x + w - 24} Q${x + w - 5} ${y + 5} ${x + w - 5} ${y + 24} V${y + h * 0.45} H${x + 5} Z`} fill={active ? 'var(--sun)' : 'var(--teal)'} opacity="0.9" />
{#each [0, 1, 2, 3] as i (i)}
  <circle cx={x + w * (0.22 + i * 0.185)} cy={y + h * 0.68} r={active ? 9 : 7} fill={active ? 'var(--orange)' : 'var(--paper-2)'} stroke="var(--line)" stroke-width="4" />
{/each}
{#if active}<path d={`M${x + 20} ${y + h - 18} H${x + w - 20}`} stroke="var(--orange)" stroke-width="9" stroke-linecap="round" />{/if}
