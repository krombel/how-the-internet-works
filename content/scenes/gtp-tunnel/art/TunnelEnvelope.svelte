<svelte:options namespace="svg" />
<script lang="ts">
  let { x, y, scale = 1, open = false }: { x: number; y: number; scale?: number; open?: boolean } = $props();
</script>

<g transform="translate({x} {y}) scale({scale})">
  <rect x="-82" y="-52" width="164" height="104" rx="18" fill="#fff2d7" stroke="#6b3f2a" stroke-width="5" />
  <path d={open ? 'M-76 -46 L0 -88 L76 -46' : 'M-76 -46 L0 6 L76 -46'} fill="#f5d9a3" stroke="#6b3f2a" stroke-width="4" stroke-linejoin="round" />
  <path d="M-76 46 L-12 -2 M76 46 L12 -2" fill="none" stroke="#6b3f2a" stroke-width="3.5" stroke-linecap="round" opacity="0.75" />
  <rect x="-62" y="10" width="92" height="26" rx="8" fill="#fff7df" stroke="#6b3f2a" stroke-width="3.5" />
  <path d="M-52 23 H18" stroke="#a65435" stroke-width="4" stroke-linecap="round" />
  <circle cx="-38" cy="-2" r="4.5" fill="#6b3f2a" />
  <circle cx="-16" cy="-2" r="4.5" fill="#6b3f2a" />
  <path d="M-60 -25 H60" stroke="#bd6b87" stroke-width="7" stroke-linecap="round" opacity="0.8" />
  <path d="M-58 37 H48" stroke="#72b8a5" stroke-width="6" stroke-linecap="round" opacity="0.8" />
</g>
