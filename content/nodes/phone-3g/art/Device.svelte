<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 96];
</script>

<!-- a 2010 smartphone: a shorter body with square-ish corners, a 3:2 screen, the earpiece above it, a home button below -->
<rect class="body peach" x="56" y="22" width="88" height="160" rx="18" />
<path class="line thin" d="M88 36 H112" />
<rect class="screen" x="66" y="48" width="68" height="100" rx="4" />
<path class="hi" d="M74 56 h44 a6 6 0 0 1 6 6 v6 H74 Z" />
<circle class="button" cx="100" cy="164" r="9" />
