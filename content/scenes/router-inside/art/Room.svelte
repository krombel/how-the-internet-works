<svelte:options namespace="svg" />
<script lang="ts">
  // One room in the router: a card with a tinted header, its title, what it's drawn doing (children) and a line. A room
  // this trip doesn't pass through is faded back under a veil of paper.
  import type { Snippet } from 'svelte';
  import { textBox } from '$core/api';
  import type { RoomProps } from '../types';
  let { box, tint, title, line, used, head, body, children }: RoomProps & { children: Snippet } = $props();
  const { x, y, w, h } = $derived(box);
  // a long line (the ONT's "XGS-PON · 1270/1577 nm") shrinks to fit inside the card rather than spill past its edges
  const lineSize = $derived(line ? Math.min(body, (body * (w - 32)) / textBox(line, body, 'middle', 0.6, '--label-font').w) : body);
</script>

<rect x={x + 8} y={y + 10} width={w} height={h} rx="22" fill="var(--shade)" opacity="0.13" />
<rect {x} {y} width={w} height={h} rx="22" fill="var(--paper)" stroke="var(--line)" stroke-width="6" />
<path d={`M${x + 4} ${y + 26} Q${x + 4} ${y + 4} ${x + 26} ${y + 4} H${x + w - 26} Q${x + w - 4} ${y + 4} ${x + w - 4} ${y + 26} V${y + head * 1.9} H${x + 4} Z`} fill={tint} opacity="0.86" />
<text x={x + w / 2} y={y + head * 1.3} text-anchor="middle" font-family="var(--label-font)" font-size={head} font-weight="900" fill="var(--line)" stroke="var(--paper)" stroke-width="6" paint-order="stroke">{title}</text>
{@render children()}
{#if line}<text x={x + w / 2} y={y + h - body * 0.9} text-anchor="middle" font-family="var(--label-font)" font-size={lineSize} font-weight="800" fill="var(--line)">{line}</text>{/if}
{#if !used}<rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx="24" fill="var(--paper)" opacity="0.55" />{/if}
