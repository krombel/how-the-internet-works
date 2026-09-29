<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 108];
</script>

<circle class="body peach" cx="100" cy="100" r="66" />
<ellipse class="wave" cx="100" cy="100" rx="30" ry="66" />
<path class="wave" d="M35 100 H165 M47 67 H153 M47 133 H153" />
