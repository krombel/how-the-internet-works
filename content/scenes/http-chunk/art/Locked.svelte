<svelte:options namespace="svg" />
<script lang="ts">
  // What a hop that can't open HTTP sees: a locked kraft box with scrambled marks. Only its size says anything.
  let { x, y, scale = 1 }: { x: number; y: number; scale?: number } = $props();
</script>

<g transform="translate({x} {y}) scale({scale})">
  <rect x="-72" y="-48" width="144" height="96" rx="16" fill="var(--kraft)" stroke="var(--line)" stroke-width="6" />
  <path d="M-50 -12 C-34 -25 -22 2 -6 -12 S24 -20 50 -8 M-50 22 C-26 10 -14 34 6 20 S30 8 50 22" fill="none" stroke="var(--line)" stroke-width="5" stroke-linecap="round" opacity="0.7" />
  <g transform="translate(46 -46)">
    <path d="M-14 4 V-6 C-14 -22 14 -22 14 -6 V4" fill="none" stroke="var(--line)" stroke-width="6" stroke-linecap="round" />
    <rect x="-22" y="0" width="44" height="34" rx="8" fill="var(--muted)" stroke="var(--line)" stroke-width="5" />
    <circle cy="17" r="5" fill="var(--paper)" />
  </g>
</g>
