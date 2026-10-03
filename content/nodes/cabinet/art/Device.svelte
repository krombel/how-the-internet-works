<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 96];
</script>

<!-- a street cabinet with a passive splitter: one fibre in at the top fans out to the houses -->
<rect class="body berry" x="51" y="28" width="98" height="152" rx="16" />
<path class="line thin" d="M100 40 V52 M100 52 L72 66 M100 52 L86 66 M100 52 V66 M100 52 L114 66 M100 52 L128 66 M100 128 V168" />
<circle class="accent" cx="80" cy="150" r="6" /><circle class="accent" cx="120" cy="150" r="6" />
