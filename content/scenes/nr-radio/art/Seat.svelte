<svelte:options namespace="svg" />
<script lang="ts">
  import type { SeatProps } from '../types';
  let { x, y, w, h, colour, now }: SeatProps = $props();
</script>

<g>
  <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx="7" fill={colour ?? '#fff7df'} stroke="#6b3f2a" stroke-width={now ? 5 : 3} opacity={colour ? 1 : 0.6} />
  {#if colour}<path d={`M${x + 10} ${y + 10} h${w - 26}`} stroke="#fff7df" stroke-width="3" stroke-linecap="round" opacity="0.6" />{/if}
</g>
