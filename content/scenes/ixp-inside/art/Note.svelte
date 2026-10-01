<svelte:options namespace="svg" />
<script lang="ts">
  import type { NoteProps } from '../types';
  let { p, alpha, time, night }: NoteProps = $props();
  const tilt = $derived(Math.sin(time * 7) * 5);
</script>

{#if alpha > 0.02}
  {#if night}<circle cx={p.x} cy={p.y} r="25" fill="var(--orange)" opacity={0.18 * alpha} />{/if}
  <g transform={`translate(${p.x} ${p.y}) rotate(${tilt})`} opacity={alpha}>
    <rect x="-18" y="-13" width="36" height="26" rx="5" fill="var(--paper-white)" stroke="var(--line)" stroke-width="4" />
    <path d="M-12 -3 H12 M-12 6 H6" stroke="var(--orange)" stroke-width="4" stroke-linecap="round" />
  </g>
{/if}
