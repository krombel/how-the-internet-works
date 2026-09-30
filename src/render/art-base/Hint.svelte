<svelte:options namespace="svg" />
<script lang="ts">
  // Doors: a round lens (look inside), a door (open up) and a rounded square (change), each with its mark,
  // coloured from the --hint / --hint-bg tokens. A group breathes an outline at rest; anything hot glows.
  import type { HintProps } from '../theme-types';
  let { kind, part, x, y, label, labelW, labelled, size, hot, target, time }: HintProps = $props();
  const R = $derived(size);
  const f = $derived((time / 1.6) % 1);
  const breathe = $derived(0.5 + 0.5 * Math.sin(time * 2.2));
  const tw = $derived(labelled ? labelW * 0.9 : 0);
  const pw = $derived(labelled ? R * 2 + tw + size * 0.8 : R * 2);
  const x0 = $derived(kind === 'expand' ? -pw / 2 : -R);
  const mx = $derived(x0 + R);
  const node = $derived('d' in target ? null : target);
</script>

{#if part === 'glow'}
  {#if !node}
    {#if hot}<path d={'d' in target ? target.d : ''} fill="none" stroke="var(--hint, #fff)" stroke-width={size * 1.4} stroke-linecap="round" opacity=".3" pointer-events="none" />{/if}
  {:else if kind === 'expand' || hot}
    <ellipse cx={node.x} cy={node.y + node.size * 0.05} rx={node.size * (0.42 + 0.02 * breathe)} ry={node.size * (0.36 + 0.02 * breathe)}
      fill="none" stroke="var(--hint, #fff)" stroke-width={size * 0.18} stroke-dasharray="{size * 0.6} {size * 0.5}"
      opacity={hot ? 0.9 : 0.25 + 0.35 * breathe} pointer-events="none" />
  {/if}
{:else}
  <g class="hint" transform="translate({x} {y}) scale({hot ? 1.12 : 1})" pointer-events="none">
    {#if !hot && !labelled}<circle r={R + R * 1.4 * f} fill="none" stroke="var(--hint, #fff)" stroke-width="3" opacity={0.8 * (1 - f)} />{/if}
    {#if labelled}
      <rect x={x0} y={-R} width={pw} height={R * 2} rx={R} fill="var(--hint-bg, rgba(0,0,0,.5))" stroke="var(--hint, #fff)" stroke-width={size * 0.18} />
      <text x={mx + R + size * 0.2 + tw / 2} y="0" font-size={size * 0.9} text-anchor="middle" dominant-baseline="central"
        fill="var(--hint, #fff)" font-family="var(--label-font)" font-weight="700">{label}</text>
    {:else if kind === 'swap'}
      <rect x={-R} y={-R} width={R * 2} height={R * 2} rx={R * 0.35} fill="var(--hint-bg, rgba(0,0,0,.5))" stroke="var(--hint, #fff)" stroke-width={size * 0.18} />
    {:else}
      <circle r={R} fill="var(--hint-bg, rgba(0,0,0,.5))" stroke="var(--hint, #fff)" stroke-width={size * 0.18} />
    {/if}
    <g transform="translate({mx} 0) scale({R / 20})" fill="none" stroke="var(--hint, #fff)" stroke-linecap="round" stroke-linejoin="round">
      {#if kind === 'dive'}
        <circle r="8" cx="-3" cy="-3" stroke-width="3.5" /><path d="M3 3 L10 10" stroke-width="4" />
      {:else if kind === 'swap'}
        <path d="M-9 -4 H8 L3 -9 M9 4 H-8 L-3 9" stroke-width="3.5" />
      {:else}
        <path d="M-8 11 V-10 H8 V11 M-8 -10 L3 -7 V14 L-8 11 Z" stroke-width="3" />
      {/if}
    </g>
  </g>
{/if}
