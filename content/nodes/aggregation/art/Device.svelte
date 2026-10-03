<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 64];
</script>

<!-- a tall chassis switch with a stack of line cards, and a road down to each of three racks below it -->
{#each [46, 100, 154] as x (x)}<path class="wave" d={`M${100 + (x - 100) * 0.4} 136 L${x} 160`} />{/each}
{#each [46, 100, 154] as x (x)}<rect class="body peach" x={x - 14} y="156" width="28" height="24" rx="5" />{/each}
<rect class="body orange" x="40" y="22" width="120" height="116" rx="14" />
{#each [94, 110, 126] as y (y)}
  <rect class="screen" x="54" y={y - 6} width="92" height="11" rx="3" />
  <circle class="accent" cx="64" cy={y} r="3" />
{/each}
