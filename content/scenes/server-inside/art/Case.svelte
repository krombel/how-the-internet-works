<svelte:options namespace="svg" />
<script lang="ts">
  import type { CaseProps } from '../types';
  let { box, time, night }: CaseProps = $props();
  const { x, y, w, h } = $derived(box);
  const leds = $derived([0, 1, 2, 3].map((i) => ({
    x: x + 70 + i * 38,
    y: y + 42,
    on: Math.sin(time * (2.4 + i * 0.3) + i) > -0.25,
    fill: ['var(--teal)', 'var(--sun)', 'var(--berry)', 'var(--leaf)'][i],
  })));
</script>

<rect x={x + 12} y={y + 16} width={w} height={h} rx="42" fill="var(--shade)" opacity="0.14" />
<rect {x} {y} width={w} height={h} rx="42" fill="var(--stone)" stroke="var(--line)" stroke-width="9" />
<rect x={x + 18} y={y + 18} width={w - 36} height={h - 36} rx="30" fill="var(--paper-2)" stroke="var(--line)" stroke-width="3" stroke-dasharray="15 13" opacity="0.82" />
<path d={`M${x + w - 54} ${y + 95} V${y + h - 95} M${x + 54} ${y + 95} V${y + h - 95}`} stroke="var(--line)" stroke-width="7" stroke-linecap="round" opacity="0.42" />
{#each leds as l, i (i)}
  {#if night && l.on}<circle cx={l.x} cy={l.y} r="22" fill={l.fill} opacity="0.28" />{/if}
  <circle cx={l.x} cy={l.y} r="9" fill={l.on ? l.fill : 'var(--paper)'} stroke="var(--line)" stroke-width="4" />
{/each}
