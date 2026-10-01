<svelte:options namespace="svg" />
<script lang="ts">
  import type { CarrierProps } from '../types';
  let { p, alpha, time, kind, colour, night }: CarrierProps = $props();
  const bob = $derived(Math.sin(time * 8) * 3);
</script>

{#if alpha > 0.02}
  {#if kind === 'other'}
    {#if night}<circle cx={p.x} cy={p.y} r="28" fill={colour} opacity={0.16 * alpha} />{/if}
    <circle cx={p.x} cy={p.y} r="12" fill={colour} stroke="var(--line)" stroke-width="4" opacity={alpha} />
    <circle cx={p.x - 4} cy={p.y - 4} r="4" fill="var(--paper-white)" opacity={0.85 * alpha} />
  {:else}
    {#if night}<ellipse cx={p.x} cy={p.y} rx="56" ry="40" fill="var(--sun)" opacity={0.22 * alpha} />{/if}
    <g transform={`translate(${p.x} ${p.y + bob * 0.2}) rotate(${Math.sin(time * 6) * 4})`} opacity={alpha}>
      <rect x="-31" y="-23" width="62" height="46" rx="9" fill="var(--kraft)" stroke="var(--line)" stroke-width="6" />
      <path d="M-28 -8 H28 M0 -21 V22" stroke="var(--kraft-edge)" stroke-width="5" stroke-linecap="round" />
      <path d="M-17 -22 L0 -5 L17 -22" fill="var(--flap)" stroke="var(--line)" stroke-width="4" stroke-linejoin="round" />
      <rect x="-13" y="4" width="26" height="15" rx="4" fill={colour} stroke="var(--line)" stroke-width="3" />
    </g>
  {/if}
{/if}
