<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 120];
</script>

<!-- a traffic warden's box: one road in, forking to three servers it can choose between -->
<path class="wave" d="M100 82 V58 M100 58 L56 32 M100 58 V26 M100 58 L144 32" />
{#each [[56, 30], [100, 24], [144, 30]] as [x, y] (x)}<circle class="accent" cx={x} cy={y} r="9" />{/each}
<rect class="body teal" x="32" y="80" width="136" height="88" rx="22" />
