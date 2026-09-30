<svelte:options namespace="svg" />
<script lang="ts">
  import type { CardProps } from '../types';
  let { x, y, w, h, tint = '#f28f5b' }: CardProps = $props();
</script>

<g>
  <rect x={x + 9} y={y + 11} width={w} height={h} rx="24" fill="#6b3f2a" opacity="0.13" />
  <rect {x} {y} width={w} height={h} rx="24" fill="#fff7df" stroke="#6b3f2a" stroke-width="6" />
  <path d={`M${x + 4} ${y + 28} Q${x + 4} ${y + 4} ${x + 28} ${y + 4} H${x + w - 28} Q${x + w - 4} ${y + 4} ${x + w - 4} ${y + 28} V${y + 58} H${x + 4} Z`} fill={tint} opacity="0.86" />
  <circle cx={x + w - 34} cy={y + 31} r="11" fill="#ffcf5d" stroke="#6b3f2a" stroke-width="4" />
</g>
