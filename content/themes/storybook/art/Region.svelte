<svelte:options namespace="svg" />
<script lang="ts">
  import type { RegionProps } from '$core/api';
  import { textBox } from '$core/api';
  let { part, d, tone, aside, x, y, label, size }: RegionProps = $props();
  // each network a colour of paper laid on the hills, like countries on a map; neighbours never share one
  const TONES = ['--orange', '--teal', '--berry', '--mustard'].map((t) => `color-mix(in srgb, var(${t}) 45%, var(--paper))`);
  // and each its own edge (dots, dashes, dash-dots, pairs of dots), so neighbours differ without colour too
  const EDGES = ['2 16', '18 16', '18 14 2 14', '2 12 2 26'];
  const fill = $derived(TONES[tone % TONES.length]);
  const edge = $derived(EDGES[tone % EDGES.length]);
  // measured once per name at 100 px and scaled: the size changes at every step of a zoom
  const per = $derived(textBox(label, 100, 'middle', 0.6, '--label-font').w / 100);
  const w = $derived(per * size);
  const pad = $derived(size * 0.55);
</script>

{#if part === 'area'}
  <path {d} class="storybook-region" fill={aside ? 'none' : fill} fill-opacity="0.6" stroke="var(--line)" stroke-opacity={aside ? 0.4 : 0.55}
    stroke-width="6" stroke-dasharray={edge} stroke-linecap="round" stroke-linejoin="round" />
{:else}
  <g class="storybook-region-sign" transform="translate({x} {y})">
    <rect x={-w / 2 - pad - size * 0.9} y={-size * 0.78} width={w + pad * 2 + size * 0.9} height={size * 1.56} rx={size * 0.78}
      fill="var(--paper)" stroke="var(--line)" stroke-width={Math.max(2, size * 0.1)} />
    <circle cx={-w / 2 - size * 0.45} cy="0" r={size * 0.36} fill={fill} stroke="var(--line)" stroke-width={Math.max(1.5, size * 0.08)} />
    <text x="0" y="0" font-size={size} text-anchor="middle" dominant-baseline="central" class="storybook-region-name">{label}</text>
  </g>
{/if}

<style>
  .storybook-region-name { font-family: var(--label-font); font-weight: 700; fill: var(--ink); }
</style>
