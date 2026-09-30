<svelte:options namespace="svg" />
<script lang="ts">
  import type { EmitterProps } from '../types';
  let { x, y, kind, colour, channel, size = 1 }: EmitterProps = $props();
</script>

<g transform={size === 1 ? undefined : `translate(${x} ${y}) scale(${size}) translate(${-x} ${-y})`}>
  {#if kind === 'laser'}
    <g class="emitter laser-{channel}">
      <rect x={x - 46} y={y - 35} width="88" height="70" rx="20" fill="var(--peach)" stroke="var(--line)" stroke-width="5" />
      <path d={`M${x - 31} ${y - 20} h30`} stroke="var(--paper)" stroke-width="6" stroke-linecap="round" opacity="0.7" />
      <circle cx={x + 23} cy={y} r="13" fill={colour} stroke="var(--line)" stroke-width="4" />
    </g>
  {:else}
    <g class="detector detector-{channel}">
      <path d={`M${x - 42} ${y - 32} H${x + 42} V${y + 18} Q${x + 36} ${y + 34} ${x + 20} ${y + 34} H${x - 22} Q${x - 38} ${y + 34} ${x - 42} ${y + 18} Z`} fill="var(--teal)" stroke="var(--line)" stroke-width="5" />
      <circle cx={x - 15} cy={y - 3} r="13" fill="var(--paper)" stroke={colour} stroke-width="6" />
    </g>
  {/if}
</g>
