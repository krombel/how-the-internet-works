<svelte:options namespace="svg" />
<script lang="ts">
  import type { PulseProps } from '../types';
  import { pts, view } from '$core/api';
  let { head, trail, colour, channel, fade = 0, size = 1 }: PulseProps = $props();
  // fading light pales towards the core's colour (a colour, not opacity: cheaper to animate)
  const fill = $derived(fade ? `color-mix(in srgb, ${colour}, var(--paper) ${(fade * 100).toFixed(1)}%)` : colour);
  // every frame moves the pulse: the trail's points are worked out once for all its strokes, and the round shapes at
  // its head move by one translate each rather than each circle's centre (fewer attributes to write and restyle)
  const points = $derived(pts(trail));
  const at = $derived(`translate(${head.x} ${head.y})`);
</script>

<g class="pulse pulse-{channel}">
  {#if view.mode === 'night'}
    <!-- light in the dark: a soft glow round the flash -->
    <polyline {points} fill="none" stroke={fill} stroke-width={34 * size} stroke-linecap="round" stroke-linejoin="round" opacity="0.2" />
    <circle transform={at} r={30 * size} fill={fill} opacity="0.28" />
  {/if}
  <polyline {points} fill="none" stroke="var(--line)" stroke-width={15 * size} stroke-linecap="round" stroke-linejoin="round" opacity="0.38" />
  <polyline {points} fill="none" stroke={fill} stroke-width={9 * size} stroke-linecap="round" stroke-linejoin="round" opacity="0.88" />
  <g transform={at}>
    <circle r={14 * size} fill="var(--paper)" stroke="var(--line)" stroke-width={4 * size} />
    <circle r={7 * size} fill={fill} />
  </g>
</g>
