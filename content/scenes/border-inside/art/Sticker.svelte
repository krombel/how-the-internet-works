<svelte:options namespace="svg" />
<script lang="ts">
  import type { StickerProps } from '../types';
  let { p, alpha, text, detached }: StickerProps = $props();
</script>

{#if alpha > 0.02}
  <g transform={`translate(${p.x} ${p.y}) rotate(${detached ? -16 : 0})`} opacity={alpha}>
    <rect x="-72" y="-24" width="144" height="48" rx="12" fill="var(--berry)" stroke="var(--line)" stroke-width="5" />
    <text x="0" y="10" text-anchor="middle" font-family="var(--label-font)" font-size="22" font-weight="900" fill="var(--paper)">{text}</text>
  </g>
{/if}
