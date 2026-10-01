<svelte:options namespace="svg" />
<script lang="ts">
  import type { BoardProps } from '../types';
  let { box, active, night }: BoardProps = $props();
  const { x, y, w, h } = $derived(box);
</script>

{#if night && active}<rect x={x - 14} y={y - 14} width={w + 28} height={h + 28} rx="30" fill="var(--sun)" opacity="0.14" />{/if}
<rect x={x + 8} y={y + 10} width={w} height={h} rx="26" fill="var(--shade)" opacity="0.13" />
<rect {x} {y} width={w} height={h} rx="26" fill="var(--paper)" stroke="var(--line)" stroke-width="6" />
<path d={`M${x + 5} ${y + 28} Q${x + 5} ${y + 5} ${x + 28} ${y + 5} H${x + w - 28} Q${x + w - 5} ${y + 5} ${x + w - 5} ${y + 28} V${y + 70} H${x + 5} Z`} fill="var(--teal)" opacity="0.84" />
<path d={`M${x + 30} ${y + 88} H${x + w - 30}`} stroke="var(--line)" stroke-width="5" stroke-linecap="round" opacity="0.32" />
