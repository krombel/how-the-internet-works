<svelte:options namespace="svg" />
<script lang="ts">
  // Signal bars: how fast the connection is right now (3 fast, 1 slow). Filled bars are teal, the rest empty, and
  // their count says it without the colour.
  let { x, y, h, bars }: { x: number; y: number; h: number; bars: number } = $props();
  const w = $derived(h * 0.26);
  const on = $derived(Math.round(bars));
</script>

{#each [0, 1, 2] as i}
  {@const bh = h * (0.4 + 0.3 * i)}
  <rect x={x - w * 1.8 + i * w * 1.3} y={y + h - bh} width={w} height={bh} rx={w * 0.25} fill={i < on ? 'var(--teal-dark)' : 'var(--paper)'} stroke="var(--line)" stroke-width="5" />
{/each}
