<svelte:options namespace="svg" />
<script lang="ts">
  let { x, y, look = 1, scale = 1 }: { x: number; y: number; look?: number; scale?: number } = $props();
  const eye = $derived(look > 0.5 ? 9 : -9);
</script>

<g transform="translate({x} {y}) scale({scale})">
  <path d="M-58 0 C-42 -42 22 -45 48 -6 C22 -17 -8 -12 -34 10 Z" fill="#5a3827" stroke="#6b3f2a" stroke-width="5" stroke-linejoin="round" />
  <circle cx="28" cy="-25" r="25" fill="#5a3827" stroke="#6b3f2a" stroke-width="5" />
  <path d="M50 -26 L84 -15 L51 -6 Z" fill="#ffcf5d" stroke="#6b3f2a" stroke-width="4" stroke-linejoin="round" />
  <circle cx={28 + eye / 3} cy="-30" r="4" fill="#fff7df" />
  <path d="M-16 20 L-28 43 M8 18 L20 43" stroke="#6b3f2a" stroke-width="5" stroke-linecap="round" />
  <path d="M-54 -1 C-78 -20 -82 -42 -56 -54" fill="none" stroke="#6b3f2a" stroke-width="5" stroke-linecap="round" />
</g>
