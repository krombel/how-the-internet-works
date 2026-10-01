<svelte:options namespace="svg" />
<script lang="ts">
  import { legibleSize } from '$core/api';
  import type { BitProps } from '../types';
  let { x, y, bit, alpha, stem, colour, time }: BitProps = $props();
  const bob = $derived(Math.sin(time * 3 + x * 0.01) * 2);
  // the digit never gets smaller than the theme's label minimum (a phone on its side, issue #33): the bead grows
  // with it, up to what the gap to the next bit allows
  const legible = legibleSize();
  const k = $derived(Math.min(1.6, legible(36) / 36));
</script>

<g opacity={alpha} transform="translate(0 {bob})">
  <line x1={stem[0].x} y1={stem[0].y} x2={stem[1].x} y2={stem[1].y} stroke="var(--line)" stroke-width="4" stroke-dasharray="4 9" opacity="0.35" />
  <g transform={k === 1 ? undefined : `translate(${x} ${y}) scale(${k}) translate(${-x} ${-y})`}>
    <circle cx={x + 4} cy={y + 5} r="33" fill="var(--sand)" opacity="0.3" />
    <circle cx={x} cy={y} r="33" fill="var(--paper)" stroke="var(--line)" stroke-width="5" />
    <circle cx={x} cy={y} r="25" fill={colour} opacity="0.88" />
    <path d={`M${x - 11} ${y - 17} Q${x} ${y - 28} ${x + 13} ${y - 17}`} stroke="var(--paper)" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.75" />
    <text class="bit-digit" {x} y={y + 1} fill="var(--line)" stroke="var(--paper)" stroke-width="7" stroke-linejoin="round" paint-order="stroke" font-size="36" font-weight="800" text-anchor="middle" dominant-baseline="central">{bit}</text>
  </g>
</g>
