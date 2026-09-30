<svelte:options namespace="svg" />
<script lang="ts">
  let { x, y, size = 60, colour = '#ffcf5d', smudge = 0, glow = false, label = '' }: {
    x: number; y: number; size?: number; colour?: string; smudge?: number; glow?: boolean; label?: string;
  } = $props();
</script>

<g transform="translate({x} {y})">
  {#if glow}<circle r={size * 0.72} fill="#8fc97a" opacity="0.22" />{/if}
  <rect x={-size / 2} y={-size / 2} width={size} height={size} rx={size * 0.16} fill={colour} stroke="#6b3f2a" stroke-width="5" />
  <path d={`M${-size * 0.42} 0 H${size * 0.42} M0 ${-size * 0.42} V${size * 0.42}`} stroke="#6b3f2a" stroke-width="3.4" opacity="0.35" />
  {#if smudge > 0}
    <path d={`M${-size * 0.34} ${-size * 0.1} C${-size * 0.1} ${-size * 0.34} ${size * 0.16} ${size * 0.28} ${size * 0.38} ${-size * 0.02}`} fill="none" stroke="#6b3f2a" stroke-width={size * 0.16} stroke-linecap="round" opacity={0.22 + smudge * 0.45} />
    <circle cx={size * 0.18} cy={-size * 0.2} r={size * 0.14} fill="#fff7df" opacity={0.35 * smudge} />
  {/if}
  {#if label}<text x="0" y={size * 0.18} text-anchor="middle" font-size={size * 0.52} font-weight="700" fill="#6b3f2a">{label}</text>{/if}
</g>
