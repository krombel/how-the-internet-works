<svelte:options namespace="svg" />
<script lang="ts">
  // The request slip as it walks: a folded note with a sun-yellow band (the request's colour).
  let { x, y, scale = 1 }: { x: number; y: number; scale?: number } = $props();
</script>

<g transform="translate({x} {y}) scale({scale})">
  <path d="M-62 -44 H40 L62 -22 V44 H-62 Z" fill="var(--paper)" stroke="var(--line)" stroke-width="6" stroke-linejoin="round" />
  <path d="M-59 -41 H38 V-22 H-59 Z" fill="var(--sun)" />
  <path d="M40 -44 V-22 H62" fill="var(--paper-2)" stroke="var(--line)" stroke-width="5" stroke-linejoin="round" />
  <path d="M-44 0 H40 M-44 20 H20" stroke="var(--line)" stroke-width="5" stroke-linecap="round" opacity="0.55" />
</g>
