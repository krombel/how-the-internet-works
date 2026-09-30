<svelte:options namespace="svg" />
<script lang="ts">
  import type { AmplifierProps } from '../types';
  let { x, y, time }: AmplifierProps = $props();
  const glow = $derived(0.55 + 0.25 * Math.sin(time * 3 + x * 0.02));
</script>

<g class="amplifier">
  <rect x={x - 56} y={y - 78} width="112" height="156" rx="24" fill="#ffd89c" stroke="#6b3f2a" stroke-width="6" />
  <circle cx={x} cy={y} r="34" fill="#ffcf5d" stroke="#6b3f2a" stroke-width="5" />
  <path d={`M${x - 16} ${y} H${x + 16} M${x} ${y - 16} V${y + 16}`} stroke="#6b3f2a" stroke-width="7" stroke-linecap="round" />
  <circle cx={x} cy={y} r="46" fill="none" stroke="#fff7df" stroke-width="5" opacity={glow} />
</g>
