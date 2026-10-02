<svelte:options namespace="svg" />
<script lang="ts">
  import { pts } from '$core/api';
  import type { CableProps } from '../types';
  let { points, w }: CableProps = $props();
  const d = $derived(pts(points));
</script>

<g class="cable">
  <polyline points={d} fill="none" stroke="var(--line)" stroke-width={w} stroke-linecap="round" stroke-linejoin="round" />
  <polyline points={d} fill="none" stroke="var(--stone)" stroke-width={w - 10} stroke-linecap="round" stroke-linejoin="round" />
  <!-- the copper inside that carries the power -->
  <polyline points={d} fill="none" stroke="var(--mustard)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
</g>
