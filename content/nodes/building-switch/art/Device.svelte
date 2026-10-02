<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [96, 118];
</script>

<!-- a box on the basement wall: a row of copper ports for the flats, one fibre port with its glass tail -->
<path class="line" d="M152 148 V170 Q152 182 166 182 H184" />
<rect class="body" x="22" y="58" width="156" height="90" rx="16" />
{#each [0, 1, 2, 3] as i}<rect class="screen" x={36 + i * 22} y="72" width="15" height="13" rx="3" />{/each}
<rect class="body teal" x="138" y="68" width="28" height="20" rx="5" />
<circle class="accent" cx="40" cy="132" r="5" /><circle class="accent" cx="160" cy="132" r="5" />
