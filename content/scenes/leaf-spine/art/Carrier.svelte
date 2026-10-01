<svelte:options namespace="svg" />
<script lang="ts">
  import type { CarrierProps } from '../types';
  let { p, alpha, time, kind, colour, night }: CarrierProps = $props();
  const wob = $derived(Math.sin(time * 8) * 4);
</script>

{#if alpha > 0.02}
  {#if kind === 'other'}
    {#if night}<circle cx={p.x} cy={p.y} r="30" fill={colour} opacity={0.18 * alpha} />{/if}
    <circle cx={p.x} cy={p.y} r="13" fill={colour} stroke="var(--line)" stroke-width="4" opacity={alpha} />
    <circle cx={p.x - 4} cy={p.y - 4} r="4" fill="var(--paper-white)" opacity={0.85 * alpha} />
  {:else}
    {#if night}<ellipse cx={p.x} cy={p.y} rx="58" ry="42" fill="var(--sun)" opacity={0.22 * alpha} />{/if}
    <g transform={`translate(${p.x} ${p.y}) rotate(${wob})`} opacity={alpha}>
      <rect x="-32" y="-24" width="64" height="48" rx="9" fill="var(--kraft)" stroke="var(--line)" stroke-width="6" />
      <path d="M-29 -9 H29 M0 -22 V23" stroke="var(--kraft-edge)" stroke-width="5" stroke-linecap="round" />
      <path d="M-18 -23 L0 -5 L18 -23" fill="var(--flap)" stroke="var(--line)" stroke-width="4" stroke-linejoin="round" />
      <rect x="-13" y="4" width="26" height="15" rx="4" fill="var(--sun)" stroke="var(--line)" stroke-width="3" />
    </g>
  {/if}
{/if}
