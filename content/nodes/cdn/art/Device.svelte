<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 112];
</script>

{#each [0,1,2] as i}<rect class="body orange" x="39" y={38 + i * 43} width="122" height="36" rx="10" />{/each}
<path class="screen" d="M119 49 L119 67 L136 58 Z" />
<circle class="accent" cx="62" cy="56" r="5" /><circle class="accent" cx="62" cy="99" r="5" /><circle class="accent" cx="62" cy="142" r="5" />
