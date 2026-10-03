<svelte:options namespace="svg" />
<script module lang="ts">
  export const face: [number, number] = [100, 150];
</script>

<!-- a 3G mast: a pole with three flat sector antennas at the top (no big beam panel yet) and a cabinet at its foot -->
<path class="line" d="M100 30 V150" />
<path class="line thin" d="M58 48 H142 M58 76 H142" />
<rect class="body teal" x="46" y="26" width="16" height="64" rx="6" />
<rect class="body teal" x="92" y="18" width="16" height="64" rx="6" />
<rect class="body teal" x="138" y="26" width="16" height="64" rx="6" />
<path class="wave" d="M24 40 A30 30 0 0 0 24 80 M176 40 A30 30 0 0 1 176 80" />
<rect class="body cloud" x="60" y="120" width="80" height="66" rx="16" />
<path class="hi" d="M72 128 h48 a8 8 0 0 1 8 8 v4 H72 Z" />
<circle class="accent" cx="124" cy="172" r="6" />
