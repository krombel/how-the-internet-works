<svelte:options namespace="svg" />
<script lang="ts">
  import type { StationProps } from '../types';
  let { x, y, size, time }: StationProps = $props();
  // the power feed's lamp: steady, with a slow pulse
  const lamp = $derived(0.6 + 0.3 * Math.sin(time * 2.4));
</script>

<g class="station" transform="translate({x} {y}) scale({size})">
  <rect x="-60" y="-92" width="120" height="92" rx="10" fill="var(--wall-plain)" stroke="var(--line)" stroke-width="6" />
  <path d="M-72 -88 L0 -132 L72 -88 Z" fill="var(--roof-plain)" stroke="var(--line)" stroke-width="6" stroke-linejoin="round" />
  <rect x="-16" y="-50" width="32" height="50" rx="5" fill="var(--line)" opacity="0.8" />
  <rect x="-46" y="-70" width="22" height="22" rx="4" fill="var(--window)" stroke="var(--line)" stroke-width="3" />
  <!-- a power sign on the wall: the station feeds the cable's repeaters -->
  <circle cx="35" cy="-59" r="17" fill="var(--sun)" stroke="var(--face)" stroke-width="4" />
  <path d="M37 -70 L29 -57 H38 L32 -46" fill="none" stroke="var(--face)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
  <circle cx="35" cy="-59" r="25" fill="none" stroke="var(--sun)" stroke-width="4" opacity={lamp} />
</g>
