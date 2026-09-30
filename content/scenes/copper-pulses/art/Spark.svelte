<svelte:options namespace="svg" />
<script lang="ts">
  import { pts } from '$core/api';
  import type { SparkProps } from '../types';
  let { spark }: SparkProps = $props();
</script>

<!-- per-element opacity rather than a group opacity: a faded group needs its own offscreen layer every frame -->
{#if spark.alpha > 0.02}
  {@const a = spark.alpha}
  <polyline points={pts(spark.trail)} fill="none" stroke="#6b3f2a" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" opacity={0.26 * a} />
  <polyline points={pts(spark.trail)} fill="none" stroke={spark.colour} stroke-width="13" stroke-linecap="round" stroke-linejoin="round" opacity={0.92 * a} />
  <circle cx={spark.head.x} cy={spark.head.y} r="21" fill="#fff7df" stroke="#6b3f2a" stroke-width="5" opacity={a} />
  <path d={`M${spark.head.x - 10} ${spark.head.y + 6} L${spark.head.x + 4} ${spark.head.y - 17} L${spark.head.x + 2} ${spark.head.y - 2} L${spark.head.x + 15} ${spark.head.y - 6} L${spark.head.x - 2} ${spark.head.y + 19} L${spark.head.x} ${spark.head.y + 3} Z`} fill={spark.colour} opacity={a} />
{/if}
