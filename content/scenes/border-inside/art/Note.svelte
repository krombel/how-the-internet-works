<svelte:options namespace="svg" />
<script lang="ts">
  import type { NoteProps } from '../types';
  let { p, alpha, text, colour, night }: NoteProps = $props();
</script>

{#if alpha > 0.02}
  {#if night}<rect x={p.x - 43} y={p.y - 28} width="86" height="56" rx="12" fill={colour} opacity={0.16 * alpha} />{/if}
  <g opacity={alpha} transform={`translate(${p.x} ${p.y}) rotate(-6)`}>
    <rect x="-37" y="-24" width="74" height="48" rx="10" fill="var(--paper-white)" stroke="var(--line)" stroke-width="4" />
    <path d="M-22 -7 H22 M-22 6 H15" stroke={colour} stroke-width="5" stroke-linecap="round" />
    <text x="0" y="37" text-anchor="middle" font-family="var(--label-font)" font-size="18" font-weight="900" fill="var(--line)">{text}</text>
  </g>
{/if}
