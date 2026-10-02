<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 136];
</script>

<!-- the telephone exchange: a sturdy box with wires out of the top and a big rotary dial on its front -->
<path class="line thin" d="M66 34 L48 10 M100 34 V6 M134 34 L152 10" />
<rect class="body berry" x="32" y="32" width="136" height="148" rx="18" />
<circle class="screen" cx="100" cy="76" r="30" />
<g class="line thin"><circle cx="100" cy="56" r="5" /><circle cx="119" cy="66" r="5" /><circle cx="119" cy="87" r="5" /><circle cx="100" cy="96" r="5" /><circle cx="81" cy="87" r="5" /><circle cx="81" cy="66" r="5" /></g>
<circle class="accent" cx="100" cy="76" r="7" />
