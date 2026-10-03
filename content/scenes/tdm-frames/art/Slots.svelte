<svelte:options namespace="svg" />
<script lang="ts">
  // A frame's timeslots as a grid of little boxes, `cols` to a row (shared by tdm-frames and modem-call's circuit card,
  // so both draw the same 32 slots): each its own fill and, if given, a label; the one being sent now drawn bold. A
  // slot cut into quarters (GSM's 16 kbit/s sub-slots) gets `quarters`: four fills side by side inside its box.
  let { x, y, cell, cols, fills, quarters = [], labels = [], sweep = -1, size = 20 }: { x: number; y: number; cell: number; cols: number; fills: string[]; quarters?: (string[] | null)[]; labels?: string[]; sweep?: number; size?: number } = $props();
</script>

{#each fills as fill, i (i)}
  {@const cx = x + (i % cols) * cell}
  {@const cy = y + Math.floor(i / cols) * cell}
  <rect x={cx + 3} y={cy + 3} width={cell - 6} height={cell - 6} rx="6" {fill} stroke="var(--line)" stroke-width={i === sweep ? 6 : 2} />
  {#each quarters[i] ?? [] as q, k (k)}
    {@const w = (cell - 14) / 4}
    <rect x={cx + 7 + k * w} y={cy + 7} width={w} height={cell - 14} rx="2" fill={q} stroke="var(--line)" stroke-width="1" />
  {/each}
  {#if labels[i]}<text x={cx + cell / 2} y={cy + cell / 2 + size * 0.35} text-anchor="middle" font-size={size} font-weight="900" font-family="var(--tag-font)" fill="var(--line)" stroke={quarters[i] ? 'var(--paper)' : undefined} stroke-width={quarters[i] ? 4 : undefined} paint-order={quarters[i] ? 'stroke' : undefined}>{labels[i]}</text>{/if}
{/each}
