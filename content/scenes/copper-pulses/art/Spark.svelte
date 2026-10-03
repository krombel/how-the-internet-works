<svelte:options namespace="svg" />
<script lang="ts">
  import { pts, view } from '$core/api';
  import type { SparkProps } from '../types';
  let { spark }: SparkProps = $props();
  // every frame moves the spark: the trail's points are worked out once for all its strokes, and the shapes at its head
  // move by one translate each rather than by their own coordinates (fewer attributes to write and restyle)
  const points = $derived(pts(spark.trail));
  const at = $derived(`translate(${spark.head.x} ${spark.head.y})`);
</script>

<!-- per-element opacity rather than a group opacity: a faded group needs its own offscreen layer every frame -->
{#if spark.alpha > 0.02}
  {@const a = spark.alpha}
  {#if view.mode === 'night'}
    <polyline {points} fill="none" stroke={spark.colour} stroke-width="46" stroke-linecap="round" stroke-linejoin="round" opacity={0.2 * a} />
    <circle transform={at} r="40" fill={spark.colour} opacity={0.24 * a} />
  {/if}
  <polyline {points} fill="none" stroke="var(--line)" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" opacity={0.26 * a} />
  <polyline {points} fill="none" stroke={spark.colour} stroke-width="13" stroke-linecap="round" stroke-linejoin="round" opacity={0.92 * a} />
  <g transform={at}>
    <circle r="21" fill="var(--paper)" stroke="var(--line)" stroke-width="5" opacity={a} />
    <path d="M-10 6 L4 -17 L2 -2 L15 -6 L-2 19 L0 3 Z" fill={spark.colour} opacity={a} />
  </g>
{/if}
