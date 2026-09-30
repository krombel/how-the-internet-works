<svelte:options namespace="svg" />
<script lang="ts">
  let { x, y, scale = 1, active = false }: { x: number; y: number; scale?: number; active?: boolean } = $props();
</script>

<g transform="translate({x} {y}) scale({scale})">
  <ellipse cx="0" cy="30" rx="74" ry="28" fill="var(--hill-far-58b)" opacity="0.55" />
  <path d="M-70 24 C-66 -48 66 -48 70 24 L70 45 C45 68 -45 68 -70 45 Z" fill="var(--kraft)" stroke="var(--line)" stroke-width="7" stroke-linejoin="round" />
  <path d="M-44 23 C-40 -25 40 -25 44 23 L44 35 C26 50 -26 50 -44 35 Z" fill="var(--teal-deep)" stroke="var(--line)" stroke-width="5" stroke-linejoin="round" />
  <path d="M-50 21 C-35 32 35 32 50 21" fill="none" stroke="var(--paper)" stroke-width="8" stroke-linecap="round" opacity="0.6" />
  <path d="M-50 2 H50 M-36 -20 H36" fill="none" stroke="var(--clay)" stroke-width="4" stroke-linecap="round" opacity="0.68" />
  {#if active}<circle cx="0" cy="22" r="58" fill="none" stroke="var(--sun)" stroke-width="7" opacity="0.88" />{/if}
</g>
