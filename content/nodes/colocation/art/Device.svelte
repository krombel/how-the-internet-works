<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [70, 122];
</script>

<!-- a long windowless hall, clad in panels, with a row of cooling units on its roof and a roller door -->
{#each [38, 72, 106, 140] as x (x)}<rect class="body teal" {x} y="40" width="24" height="22" rx="5" />{/each}
<rect class="body" x="22" y="58" width="156" height="116" rx="12" />
<path class="line thin" d="M22 84 H178 M22 152 H112" />
<rect class="screen" x="122" y="104" width="42" height="70" rx="5" />
<path class="line thin" d="M122 120 H164 M122 136 H164 M122 152 H164" />
<circle class="accent" cx="112" cy="70" r="4" />
