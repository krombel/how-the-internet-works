<svelte:options namespace="svg" />
<script lang="ts">
  import type { BreakProps } from '../types';
  let { x, y, h }: BreakProps = $props();
  const d = (dx: number) => `M${x + dx - 18} ${y + h / 2 + 14} L${x + dx + 18} ${y - h / 2 - 14}`;
</script>

<g class="break">
  <path d={`M${x - 28} ${y + h / 2 + 14} L${x + 8} ${y - h / 2 - 14} L${x + 28} ${y - h / 2 - 14} L${x - 8} ${y + h / 2 + 14} Z`} fill="var(--paper)" />
  <path d={d(-10)} stroke="var(--line)" stroke-width="6" stroke-linecap="round" />
  <path d={d(10)} stroke="var(--line)" stroke-width="6" stroke-linecap="round" />
</g>
