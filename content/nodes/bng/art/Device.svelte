<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 100];
</script>

<rect class="body orange" x="31" y="39" width="138" height="122" rx="22" />
<path class="screen" d="M100 70 L128 84 V107 C128 122 114 132 100 137 C86 132 72 122 72 107 V84 Z" />
