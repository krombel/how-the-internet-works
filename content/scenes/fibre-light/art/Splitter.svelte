<svelte:options namespace="svg" />
<script lang="ts">
  import type { SplitterProps } from '../types';
  let { x, y }: SplitterProps = $props();
</script>

<g class="splitter">
  <rect x={x - 34} y={y - 44} width="68" height="88" rx="16" fill="var(--glass)" stroke="var(--line)" stroke-width="6" />
  <path d={`M${x + 22} ${y} L${x - 20} ${y - 26} M${x + 22} ${y} L${x - 20} ${y - 9} M${x + 22} ${y} L${x - 20} ${y + 9} M${x + 22} ${y} L${x - 20} ${y + 26}`} stroke="var(--teal)" stroke-width="5" stroke-linecap="round" />
</g>
