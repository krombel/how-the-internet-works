<svelte:options namespace="svg" />
<script lang="ts">
  import { Text, legibleSize, textBox } from '$core/api';
  let { x, y, n, size = 54, opacity = 1, scale = 1, sealed = false, glow = false, lost = false, port = '', outer = 1 }: {
    x: number; y: number; n: number; size?: number; opacity?: number; scale?: number; sealed?: boolean; glow?: boolean; lost?: boolean; port?: string;
    /** the scale of the group the box is drawn in, so the port sticker's text is measured as it shows */
    outer?: number;
  } = $props();
  // the port sticker keeps to the theme's label minimum and grows to hold its word
  const legible = legibleSize();
  const portPx = $derived(legible(size * 0.18 * scale * outer) / (scale * outer));
  const portW = $derived(Math.max(size * 1.7, textBox(port, portPx, 'middle', 0.6, '--label-font').w + 24));
  const portH = $derived(Math.max(size * 0.36, portPx * 1.4));
</script>

<g transform="translate({x} {y}) scale({scale})" opacity={opacity}>
  {#if glow}<ellipse cx="0" cy="8" rx={size * 0.74} ry={size * 0.55} fill="var(--glow-box)" opacity="0.72" />{/if}
  {#if lost}<path d="M{-size * 0.45} {size * 0.28} q{size * 0.18} {size * 0.22} {size * 0.36} 0 t{size * 0.36} 0 t{size * 0.36} 0" fill="none" stroke="var(--teal)" stroke-width="6" stroke-linecap="round" />{/if}
  <rect x={-size / 2} y={-size / 2} width={size} height={size} rx={size * 0.16} fill={sealed ? 'var(--kraft)' : 'var(--paper-2)'} stroke="var(--line)" stroke-width="5" />
  <path d="M{-size / 2} {-size * 0.12} H{size / 2} M{-size * 0.12} {-size / 2} V{size / 2}" stroke="var(--cardboard)" stroke-width="3.5" stroke-linecap="round" opacity="0.72" />
  <Text x={0} y={size * 0.16} text={`${n}`} size={size * 0.56} kind="big" colour="var(--line)" />
  {#if sealed}
    <g transform="translate({size * 0.31} {-size * 0.29}) rotate(-11)">
      <circle r={size * 0.22} fill="var(--berry-dark)" stroke="var(--line)" stroke-width="3.5" />
      <path d="M{-size * 0.09} 0 C{-size * 0.03} {-size * 0.06} {size * 0.04} {-size * 0.06} {size * 0.09} 0 M0 {-size * 0.1} V{size * 0.1}" stroke="var(--paper)" stroke-width="2.8" stroke-linecap="round" fill="none" />
    </g>
  {/if}
  {#if port}
    <g transform="translate(0 {-Math.max(size * 0.68, size / 2 + portH / 2)}) rotate(-3)">
      <rect x={-portW / 2} y={-portH / 2} width={portW} height={portH} rx="8" fill="var(--paper)" stroke="var(--line)" stroke-width="3" />
      <text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-size={portPx} font-weight="900" fill="var(--line)">{port}</text>
    </g>
  {/if}
</g>
