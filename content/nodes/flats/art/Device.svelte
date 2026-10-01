<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 104];
</script>

<!-- a block of flats: a flat roof, two rows of windows and the front door -->
<rect class="body peach" x="44" y="34" width="112" height="136" rx="6" />
<path class="roof" d="M36 36 H164" />
<rect class="screen" x="58" y="48" width="22" height="20" rx="3" /><rect class="screen" x="120" y="48" width="22" height="20" rx="3" />
<rect class="screen" x="58" y="92" width="16" height="22" rx="3" /><rect class="screen" x="126" y="92" width="16" height="22" rx="3" />
<rect class="screen" x="86" y="136" width="28" height="34" rx="4" />
