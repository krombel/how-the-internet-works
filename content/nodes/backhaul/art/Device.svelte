<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 112];
</script>

<rect class="body teal" x="19" y="68" width="162" height="66" rx="17" />
{#each [0,1,2,3,4,5] as i}<rect class="screen" x={35 + i * 23} y="88" width="16" height="14" rx="3" />{/each}
<circle class="accent" cx="44" cy="119" r="4" /><circle class="accent" cx="60" cy="119" r="4" />
