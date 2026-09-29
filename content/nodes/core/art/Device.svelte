<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 106];
</script>

<circle class="body teal" cx="100" cy="100" r="68" />
<path class="wave" d="M58 100 H142 M100 58 V142 M70 70 L130 130 M130 70 L70 130" />
<circle class="accent" cx="100" cy="100" r="15" />
