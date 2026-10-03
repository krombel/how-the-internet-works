<svelte:options namespace="svg" />
<script lang="ts">
  // A file from the web server's disk (1995): the page, a sheet of writing with a heading, or the picture on it, a
  // little landscape in a frame. Fits the film box's 144 × 96 at scale 1, so it walks and shelves the same way.
  let { x, y, file, scale = 1, glow = false }: { x: number; y: number; file: 'page' | 'picture'; scale?: number; glow?: boolean } = $props();
</script>

<g transform="translate({x} {y}) scale({scale})">
  {#if glow}<rect x="-90" y="-66" width="180" height="132" rx="34" fill="var(--glow-box)" stroke="var(--mustard)" stroke-width="6" />{/if}
  {#if file === 'page'}
    <path d="M-44 -48 H24 L44 -28 V48 H-44 Z" fill="var(--paper-white)" stroke="var(--line)" stroke-width="6" stroke-linejoin="round" />
    <rect x="-30" y="-34" width="40" height="13" rx="4" fill="var(--berry)" />
    <path d="M-30 -6 H30 M-30 12 H30 M-30 30 H12" stroke="var(--line)" stroke-width="6" stroke-linecap="round" opacity="0.6" />
  {:else}
    <rect x="-66" y="-46" width="132" height="92" rx="10" fill="var(--paper-white)" stroke="var(--line)" stroke-width="6" />
    <rect x="-52" y="-32" width="104" height="64" rx="5" fill="var(--sky)" />
    <circle cx="28" cy="-12" r="11" fill="var(--sun)" />
    <path d="M-52 32 L-20 -6 L2 16 L18 2 L52 32 Z" fill="var(--leaf)" stroke="var(--line)" stroke-width="4" stroke-linejoin="round" />
  {/if}
</g>
