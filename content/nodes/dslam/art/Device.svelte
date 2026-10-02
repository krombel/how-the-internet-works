<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 120];
</script>

<!-- a street cabinet with the phone pairs' terminal blocks (rows of pins) at the top -->
<rect class="body teal" x="46" y="28" width="108" height="152" rx="16" />
<rect class="screen" x="62" y="42" width="76" height="40" rx="6" />
<path class="line thin" d="M70 52 H130 M70 62 H130 M70 72 H130" />
<circle class="accent" cx="78" cy="160" r="6" /><circle class="accent" cx="100" cy="160" r="6" /><circle class="accent" cx="122" cy="160" r="6" />
