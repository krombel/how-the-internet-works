<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 118];
</script>

<rect class="body peach" x="57" y="12" width="86" height="176" rx="24" />
<rect class="screen" x="69" y="32" width="62" height="118" rx="14" />
<path class="hi" d="M82 47 h32 a8 8 0 0 1 8 8 v8 H82 Z" />
<circle class="button" cx="100" cy="168" r="7" />
