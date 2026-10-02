<svelte:options namespace="svg" />
<script lang="ts">
  import { pts } from '$core/api';
  import type { SeaProps } from '../types';
  let { water, ground, land, shore, surface, w, time }: SeaProps = $props();
  // a few slow ripples on the surface (moved, not redrawn)
  const drift = $derived(((time * 18) % 120) - 60);
  const ripples = $derived(Array.from({ length: Math.ceil((shore[1] - shore[0]) / 240) }, (_, i) => shore[0] + 90 + i * 240));
</script>

<g class="sea">
  <polygon points={pts(water)} fill="color-mix(in srgb, var(--blue) 34%, var(--paper))" />
  <!-- deeper water is darker: a band along the bottom -->
  <polygon points={pts(water.map((p) => ({ x: p.x, y: Math.max(p.y, (surface + water[2].y) / 2) })))} fill="var(--blue)" opacity="0.18" />
  <g transform="translate({drift} 0)">
    {#each ripples as x}<path d={`M${x} ${surface + 26} q24 -14 48 0 q24 14 48 0`} fill="none" stroke="var(--shine)" stroke-width="5" stroke-linecap="round" opacity="0.6" />{/each}
  </g>
  <line x1={shore[0]} y1={surface} x2={shore[1]} y2={surface} stroke="var(--line)" stroke-width="5" stroke-linecap="round" />
  <polygon points={pts(ground)} fill="var(--sand)" stroke="var(--line)" stroke-width="6" stroke-linejoin="round" />
  <path d={`M0 ${land} H${shore[0]} M${shore[1]} ${land} H${w}`} stroke="var(--grass-near)" stroke-width="14" />
</g>
