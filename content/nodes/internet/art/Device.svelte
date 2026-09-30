<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [92, 124];
</script>

<path class="body cloud" d="M38 154 H162 A32 32 0 0 0 152 91 A45 45 0 0 0 72 78 A40 40 0 0 0 38 154 Z" />
<!-- a little globe beside the face, clear of it -->
<circle class="body teal" cx="146" cy="126" r="15" />
<path class="line thin" d="M131 126 H161 M146 111 V141" />
<ellipse class="line thin" cx="146" cy="126" rx="7" ry="15" />
