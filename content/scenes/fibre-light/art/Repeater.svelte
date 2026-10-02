<svelte:options namespace="svg" />
<script lang="ts">
  import type { RepeaterProps } from '../types';
  let { x, y, time }: RepeaterProps = $props();
  const glow = $derived(0.5 + 0.3 * Math.sin(time * 3 + x * 0.02));
</script>

<g class="repeater">
  <rect x={x - 62} y={y - 24} width="124" height="48" rx="24" fill="var(--peach)" stroke="var(--line)" stroke-width="6" />
  <circle cx={x} cy={y} r="17" fill="var(--sun)" stroke="var(--face)" stroke-width="4" />
  <path d={`M${x - 8} ${y} H${x + 8} M${x} ${y - 8} V${y + 8}`} stroke="var(--face)" stroke-width="5" stroke-linecap="round" />
  <circle cx={x} cy={y} r="27" fill="none" stroke="var(--shine)" stroke-width="4" opacity={glow} />
</g>
