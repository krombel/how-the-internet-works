<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 108];
</script>

<rect class="body berry" x="51" y="28" width="98" height="152" rx="16" />
<path class="line thin" d="M100 42 V168 M62 72 H138" />
<circle class="accent" cx="84" cy="112" r="6" /><circle class="accent" cx="116" cy="112" r="6" />
