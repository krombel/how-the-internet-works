<svelte:options namespace="svg" />
<script lang="ts">
  // A nested scene on a sheet of paper. A layer dive is an envelope, like the ones in the peek panel: cream with a flap
  // when the hop opens that layer, tan and dashed when it only sees it sealed.
  import type { PanelProps } from '$core/api';
  let { part, kind, sealed, w, h, time }: PanelProps = $props();
  const wiggle = $derived(Math.sin(time * 0.8) * 2);
  const env = $derived(kind === 'layer');
</script>

{#if part === 'back'}
  {#if env}
    <rect width={w} height={h} fill={sealed ? 'var(--kraft)' : 'var(--paper-2)'} />
    <path d={`M0 0 L${w / 2} ${Math.min(w, h) * 0.16} L${w} 0 Z`} fill={sealed ? 'var(--flap-sealed)' : 'var(--flap)'} stroke="var(--kraft-edge)" stroke-width="4" stroke-linejoin="round" />
    <rect x="24" y="24" width={w - 48} height={h - 48} rx="52" fill="none" stroke={sealed ? 'var(--kraft-edge-sealed)' : 'var(--kraft-edge)'} stroke-width="4" stroke-dasharray="20 14" opacity="0.82" />
  {:else}
    <rect width={w} height={h} fill="var(--paper-2)" />
    <rect x="24" y="24" width={w - 48} height={h - 48} rx="52" fill="var(--paper)" stroke="var(--kraft-edge)" stroke-width="4" stroke-dasharray="20 14" opacity="0.82" />
    <path d={`M0 ${h * 0.77 + wiggle} C${w * 0.25} ${h * 0.68} ${w * 0.45} ${h * 0.84} ${w * 0.68} ${h * 0.72} C${w * 0.85} ${h * 0.63} ${w} ${h * 0.7} ${w} ${h * 0.68} L${w} ${h} H0 Z`} fill="var(--meadow)" opacity="0.52" />
  {/if}
{:else}
  <rect width={w} height={h} rx="60" fill="none" stroke="var(--line)" stroke-width="11" stroke-dasharray={env && sealed ? '44 20' : undefined} />
  <rect x="18" y="18" width={w - 36} height={h - 36} rx="48" fill="none" stroke={env ? 'var(--teal)' : 'var(--orange)'} stroke-width="5" />
{/if}
