<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 84];
</script>

<!-- a big crossroads: a switch with a road down to each of four racks (every rack has a road to every spine) -->
{#each [34, 78, 122, 166] as x (x)}<path class="wave" d={`M${100 + (x - 100) * 0.45} 118 L${x} 160`} />{/each}
{#each [34, 78, 122, 166] as x (x)}<rect class="body peach" x={x - 13} y="154" width="26" height="22" rx="5" />{/each}
<rect class="body berry" x="26" y="48" width="148" height="72" rx="18" />
{#each [0, 1, 2, 3, 4, 5] as i (i)}<rect class="screen" x={42 + i * 21} y="104" width="12" height="9" rx="2" />{/each}
