<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 92];
</script>

<!-- a rack chassis at the exchange: PON line cards side by side, each with a fibre going out to a street -->
<rect class="body peach" x="34" y="26" width="132" height="148" rx="16" />
{#each [0, 1, 2, 3, 4] as i}<rect class="screen" x={48 + i * 22} y="42" width="16" height="96" rx="4" /><circle class="accent" cx={56 + i * 22} cy="156" r="4" />{/each}
