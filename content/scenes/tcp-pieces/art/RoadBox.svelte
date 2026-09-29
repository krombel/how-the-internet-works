<svelte:options namespace="svg" />
<script lang="ts">
  import Box from './Box.svelte';
  let { x, y, n, sealed = false, glow = false, scale = 1, port = '' }: { x: number; y: number; n: number; sealed?: boolean; glow?: boolean; scale?: number; port?: string } = $props();
  const step = $derived(Math.sin(x * 0.02) * 7);
</script>

<g transform="translate({x} {y}) scale({scale}) translate({-x} {-y})">
  <ellipse cx={x} cy={y + 18} rx="54" ry="12" fill="#6b3f2a" opacity="0.14" />
  <g stroke="#6b3f2a" stroke-width="7" stroke-linecap="round">
    <path d={`M${x - 22} ${y + 8} L${x - 28 + step} ${y + 24}`} />
    <path d={`M${x + 22} ${y + 8} L${x + 28 - step} ${y + 24}`} />
  </g>
  <Box {x} y={y - 40} {n} size={70} {sealed} {glow} {port} />
</g>
