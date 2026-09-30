<svelte:options namespace="svg" />
<script lang="ts">
  import type { PulseProps } from '../types';
  import { pts } from '$core/api';
  let { head, trail, colour, channel, fade = 0, size = 1 }: PulseProps = $props();
  // fading light pales towards the core's colour (a colour, not opacity: cheaper to animate)
  const mix = (a: string, b: string, t: number) => {
    const c = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
    return `rgb(${[0, 1, 2].map((i) => Math.round(c(a, i) + (c(b, i) - c(a, i)) * t)).join(',')})`;
  };
  const fill = $derived(fade ? mix(colour, '#fff7df', fade) : colour);
</script>

<g class="pulse pulse-{channel}">
  <polyline points={pts(trail)} fill="none" stroke="#6b3f2a" stroke-width={15 * size} stroke-linecap="round" stroke-linejoin="round" opacity="0.38" />
  <polyline points={pts(trail)} fill="none" stroke={fill} stroke-width={9 * size} stroke-linecap="round" stroke-linejoin="round" opacity="0.88" />
  <circle cx={head.x} cy={head.y} r={14 * size} fill="#fff7df" stroke="#6b3f2a" stroke-width={4 * size} />
  <circle cx={head.x} cy={head.y} r={7 * size} fill={fill} />
</g>
