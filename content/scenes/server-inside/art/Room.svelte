<svelte:options namespace="svg" />
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { RoomProps } from '../types';
  let { box, tint, title, line, head, body, active = true, children }: RoomProps & { children: Snippet } = $props();
  const { x, y, w, h } = $derived(box);
</script>

<rect x={x + 8} y={y + 10} width={w} height={h} rx="22" fill="var(--shade)" opacity="0.13" />
<rect {x} {y} width={w} height={h} rx="22" fill="var(--paper)" stroke="var(--line)" stroke-width="6" />
<path d={`M${x + 4} ${y + 26} Q${x + 4} ${y + 4} ${x + 26} ${y + 4} H${x + w - 26} Q${x + w - 4} ${y + 4} ${x + w - 4} ${y + 26} V${y + head * 1.9} H${x + 4} Z`} fill={tint} opacity="0.86" />
<text x={x + w / 2} y={y + head * 1.3} text-anchor="middle" font-family="var(--label-font)" font-size={head} font-weight="900" fill="var(--line)" stroke="var(--paper)" stroke-width="6" paint-order="stroke">{title}</text>
{@render children()}
{#if line}<text x={x + w / 2} y={y + h - body * 0.9} text-anchor="middle" font-family="var(--label-font)" font-size={body} font-weight="800" fill="var(--line)">{line}</text>{/if}
{#if !active}<rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx="24" fill="var(--paper)" opacity="0.48" />{/if}
