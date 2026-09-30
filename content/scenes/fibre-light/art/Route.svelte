<svelte:options namespace="svg" />
<script lang="ts">
  import type { RouteProps } from '../types';
  import { pts } from '$core/api';
  let { points, colour, size = 1 }: RouteProps = $props();
</script>

<polyline points={pts(points)} fill="none" stroke="var(--line)" stroke-width={7 * size} opacity="0.20" stroke-linejoin="round" stroke-linecap="round" />
<polyline points={pts(points)} fill="none" stroke={colour} stroke-width={4 * size} opacity="0.35" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="14 14" />
