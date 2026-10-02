<svelte:options namespace="svg" />
<script lang="ts">
  // The main copy (the origin), far away in a cloud region: a cloud with a small film box in it. 160 × 90 at scale 1.
  let { x, y, scale = 1, busy = false }: { x: number; y: number; scale?: number; busy?: boolean } = $props();
</script>

<g transform="translate({x} {y}) scale({scale})">
  <path d="M-62 34 C-90 34 -92 -4 -64 -8 C-62 -36 -24 -46 -8 -24 C4 -48 52 -44 54 -12 C84 -12 88 34 58 34 Z" fill="var(--glass)" stroke={busy ? 'var(--teal-dark)' : 'var(--line)'} stroke-width={busy ? 8 : 6} stroke-linejoin="round" />
  <rect x="-26" y="-8" width="52" height="34" rx="7" fill="var(--berry)" stroke="var(--line)" stroke-width="4" />
  <path d="M-18 -2 h6 M-4 -2 h6 M10 -2 h6 M-18 20 h6 M-4 20 h6 M10 20 h6" stroke="var(--paper)" stroke-width="4" stroke-linecap="round" />
</g>
