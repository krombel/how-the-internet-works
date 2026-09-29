<svelte:options namespace="svg" />
<script lang="ts">
  let { x, y, colour, active = false, scale = 1 }: { x: number; y: number; colour: string; active?: boolean; scale?: number } = $props();
</script>

<g class="pot" class:active transform="translate({x} {y}) scale({scale})">
  {#if active}<ellipse cx="0" cy="32" rx="58" ry="18" fill="#fff0b3" opacity="0.75" />{/if}
  <path d="M-46 -10 H46 L35 48 H-35 Z" fill="#f5d9a3" stroke="#6b3f2a" stroke-width="5" stroke-linejoin="round" />
  <ellipse cx="0" cy="-12" rx="49" ry="18" fill={colour} stroke="#6b3f2a" stroke-width="5" />
  <path d="M-28 -17 C-12 -27 13 -25 28 -15" fill="none" stroke="#fff7df" stroke-width="5" stroke-linecap="round" opacity="0.62" />
  <path d="M-18 12 Q0 24 18 12" fill="none" stroke="#6b3f2a" stroke-width="4" stroke-linecap="round" opacity="0.55" />
</g>
