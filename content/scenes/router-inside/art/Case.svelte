<svelte:options namespace="svg" />
<script lang="ts">
  // The router's box, opened up: its shell, the Wi‑Fi antennas on top and a row of status lights that blink as
  // parcels pass (and glow at night).
  import type { CaseProps } from '../types';
  let { box, antennas, time, night }: CaseProps = $props();
  const { x, y, w, h } = $derived(box);
  const leds = $derived([0, 1, 2].map((i) => ({ x: x + 70 + i * 44, y: y + 40, on: Math.sin(time * (3 + i) + i * 2) > -0.3, fill: ['var(--leaf)', 'var(--sun)', 'var(--teal)'][i] })));
</script>

{#each antennas as a (a.x)}
  <path d={`M${a.x} ${a.y} V${a.y - 60}`} stroke="var(--line)" stroke-width="14" stroke-linecap="round" />
  <circle cx={a.x} cy={a.y - 66} r="15" fill="var(--sun)" stroke="var(--line)" stroke-width="6" />
{/each}
<rect x={x + 12} y={y + 16} width={w} height={h} rx="46" fill="var(--shade)" opacity="0.14" />
<rect {x} {y} width={w} height={h} rx="46" fill="var(--orange-soft)" stroke="var(--line)" stroke-width="9" />
<rect x={x + 16} y={y + 16} width={w - 32} height={h - 32} rx="34" fill="var(--paper-2)" stroke="var(--line)" stroke-width="3" stroke-dasharray="14 12" opacity="0.8" />
{#each leds as l, i (i)}
  {#if night && l.on}<circle cx={l.x} cy={l.y} r="22" fill={l.fill} opacity="0.3" />{/if}
  <circle cx={l.x} cy={l.y} r="9" fill={l.on ? l.fill : 'var(--paper)'} stroke="var(--line)" stroke-width="4" />
{/each}
