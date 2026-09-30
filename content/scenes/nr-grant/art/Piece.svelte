<svelte:options namespace="svg" />
<script lang="ts">
  let { x, y, size = 60, colour = 'var(--sun)', smudge = 0, glow = false, label = '' }: {
    x: number; y: number; size?: number; colour?: string; smudge?: number; glow?: boolean; label?: string;
  } = $props();
</script>

<g transform="translate({x} {y})">
  {#if glow}<circle r={size * 0.72} fill="var(--leaf)" opacity="0.22" />{/if}
  <rect x={-size / 2} y={-size / 2} width={size} height={size} rx={size * 0.16} fill={colour} stroke="var(--line)" stroke-width="5" />
  <path d={`M${-size * 0.42} 0 H${size * 0.42} M0 ${-size * 0.42} V${size * 0.42}`} stroke="var(--line)" stroke-width="3.4" opacity="0.35" />
  {#if smudge > 0}
    <path d={`M${-size * 0.34} ${-size * 0.1} C${-size * 0.1} ${-size * 0.34} ${size * 0.16} ${size * 0.28} ${size * 0.38} ${-size * 0.02}`} fill="none" stroke="var(--line)" stroke-width={size * 0.16} stroke-linecap="round" opacity={0.22 + smudge * 0.45} />
    <circle cx={size * 0.18} cy={-size * 0.2} r={size * 0.14} fill="var(--paper)" opacity={0.35 * smudge} />
  {/if}
  {#if label}<text x="0" y={size * 0.18} text-anchor="middle" font-size={size * 0.52} font-weight="700" fill="var(--line)">{label}</text>{/if}
</g>
