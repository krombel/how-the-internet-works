<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 108];
</script>

<rect class="body teal" x="19" y="56" width="162" height="92" rx="18" />
{#each [0,1,2,3,4,5] as i}<rect class="screen" x={35 + i * 23} y="70" width="16" height="14" rx="3" />{/each}
<circle class="accent" cx="40" cy="132" r="4" /><circle class="accent" cx="56" cy="132" r="4" />
