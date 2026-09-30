<svelte:options namespace="svg" />
<script lang="ts">
  import type { RingsProps } from '../types';
  let { cx, cy, rings }: RingsProps = $props();
  const cols = ['var(--teal)', 'var(--orange)', 'var(--berry-f8f)'];
</script>

{#each rings as ring, i}
  <circle {cx} {cy} r={ring.r} opacity={ring.alpha * 0.65} fill="none" stroke="var(--paper-6d7)" stroke-width="10" />
  <circle {cx} {cy} r={ring.r} opacity={ring.alpha} fill="none" stroke={cols[i % cols.length]} stroke-width="5" stroke-linecap="round" stroke-dasharray="20 16" />
{/each}
