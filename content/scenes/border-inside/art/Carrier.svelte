<svelte:options namespace="svg" />
<script lang="ts">
  import type { CarrierProps } from '../types';
  let { p, alpha, stickerAlpha, time, night }: CarrierProps = $props();
  const bob = $derived(Math.sin(time * 8) * 3);
</script>

{#if alpha > 0.02}
  {#if night}<ellipse cx={p.x} cy={p.y} rx="60" ry="42" fill="var(--sun)" opacity={0.18 * alpha} />{/if}
  <g transform={`translate(${p.x} ${p.y + bob * 0.2})`} opacity={alpha}>
    <rect x="-31" y="-24" width="62" height="48" rx="9" fill="var(--kraft)" stroke="var(--line)" stroke-width="6" />
    <path d="M-28 -8 H28 M0 -22 V23" stroke="var(--kraft-edge)" stroke-width="5" stroke-linecap="round" />
    <path d="M-18 -23 L0 -5 L18 -23" fill="var(--flap)" stroke="var(--line)" stroke-width="4" stroke-linejoin="round" />
    {#if stickerAlpha > 0.02}
      <rect x="-18" y="3" width="36" height="17" rx="5" fill="var(--berry)" stroke="var(--line)" stroke-width="3" opacity={stickerAlpha} />
      <path d="M-8 11 H8" stroke="var(--paper)" stroke-width="4" stroke-linecap="round" opacity={stickerAlpha} />
    {/if}
  </g>
{/if}
