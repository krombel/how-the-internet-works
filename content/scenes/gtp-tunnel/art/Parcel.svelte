<svelte:options namespace="svg" />
<script lang="ts">
  let { x, y, scale = 1, colour = 'var(--sun)' }: { x: number; y: number; scale?: number; colour?: string } = $props();
</script>

<g transform="translate({x} {y}) scale({scale})">
  <rect x="-37" y="-24" width="74" height="48" rx="10" fill={colour} stroke="var(--line)" stroke-width="5" />
  <path d="M-37 -3 H37 M0 -24 V24" fill="none" stroke="var(--line)" stroke-width="3.5" stroke-linecap="round" opacity="0.72" />
  <circle cx="-14" cy="-5" r="4" fill="var(--line)" />
  <circle cx="13" cy="-5" r="4" fill="var(--line)" />
  <path d="M-12 9 Q0 17 13 9" fill="none" stroke="var(--line)" stroke-width="3" stroke-linecap="round" />
  <path d="M-24 -16 C-12 -24 10 -23 23 -13" fill="none" stroke="var(--paper)" stroke-width="5" stroke-linecap="round" opacity="0.48" />
</g>
