<svelte:options namespace="svg" />
<script lang="ts">
  import type { SharkProps } from '../types';
  let { x, y, left, time }: SharkProps = $props();
  const wag = $derived(Math.sin(time * 6) * 7);
</script>

<g class="shark" transform="translate({x} {y}) scale({left ? 1 : -1} 1)">
  <path d={`M78 0 L118 ${-26 + wag} L108 0 L118 ${26 + wag} Z`} fill="var(--stone)" stroke="var(--line)" stroke-width="5" stroke-linejoin="round" />
  <path d="M-10 -22 L14 -52 L30 -22 Z" fill="var(--stone)" stroke="var(--line)" stroke-width="5" stroke-linejoin="round" />
  <path d="M-80 4 C-60 -30 40 -32 84 0 C40 30 -50 28 -80 4 Z" fill="var(--stone)" stroke="var(--line)" stroke-width="5" stroke-linejoin="round" />
  <path d="M-64 12 C-30 24 30 22 70 4" fill="none" stroke="var(--paper-2)" stroke-width="6" stroke-linecap="round" />
  <path d="M-4 14 L10 32 L22 12" fill="var(--stone)" stroke="var(--line)" stroke-width="4" stroke-linejoin="round" />
  <circle cx="-50" cy="-4" r="5" fill="var(--line)" />
  <path d="M-72 10 q8 5 16 2" fill="none" stroke="var(--line)" stroke-width="3" stroke-linecap="round" />
</g>
