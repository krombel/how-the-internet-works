<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 96];
</script>

<rect class="body berry" x="51" y="28" width="98" height="152" rx="16" />
<path class="line thin" d="M70 46 H130 M70 56 H130 M100 128 V168" />
<circle class="accent" cx="80" cy="150" r="6" /><circle class="accent" cx="120" cy="150" r="6" />
