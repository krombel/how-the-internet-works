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
    <rect width={w} height={h} fill={sealed ? '#f5d9a3' : '#fff2d7'} />
    <path d={`M0 0 L${w / 2} ${Math.min(w, h) * 0.16} L${w} 0 Z`} fill={sealed ? '#ecca8e' : '#fbe4b8'} stroke="#e8be80" stroke-width="4" stroke-linejoin="round" />
    <rect x="24" y="24" width={w - 48} height={h - 48} rx="52" fill="none" stroke={sealed ? '#c99b5e' : '#e8be80'} stroke-width="4" stroke-dasharray="20 14" opacity="0.82" />
  {:else}
    <rect width={w} height={h} fill="#fff1d1" />
    <rect x="24" y="24" width={w - 48} height={h - 48} rx="52" fill="#fff7df" stroke="#e8be80" stroke-width="4" stroke-dasharray="20 14" opacity="0.82" />
    <path d={`M0 ${h * 0.77 + wiggle} C${w * 0.25} ${h * 0.68} ${w * 0.45} ${h * 0.84} ${w * 0.68} ${h * 0.72} C${w * 0.85} ${h * 0.63} ${w} ${h * 0.7} ${w} ${h * 0.68} L${w} ${h} H0 Z`} fill="#d7e7a3" opacity="0.52" />
  {/if}
{:else}
  <rect width={w} height={h} rx="60" fill="none" stroke="#6b3f2a" stroke-width="11" stroke-dasharray={env && sealed ? '44 20' : undefined} />
  <rect x="18" y="18" width={w - 36} height={h - 36} rx="48" fill="none" stroke={env ? '#72b8a5' : '#f28f5b'} stroke-width="5" />
{/if}
