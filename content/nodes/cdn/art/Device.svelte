<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 60];
</script>

<rect class="body orange" x="39" y="30" width="122" height="64" rx="12" />
{#each [0,1] as i}<rect class="body orange" x="39" y={101 + i * 37} width="122" height="30" rx="10" />{/each}
<path class="screen" d="M134 66 L134 82 L148 74 Z" />
<circle class="accent" cx="56" cy="78" r="5" /><circle class="accent" cx="62" cy="116" r="5" /><circle class="accent" cx="62" cy="153" r="5" />
