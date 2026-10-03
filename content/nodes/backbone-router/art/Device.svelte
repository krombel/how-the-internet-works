<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 58];
</script>

<!-- a tall router chassis: a fan tray on top, a row of line cards with their ports, and cables out of the side -->
<path class="line thin" d="M168 112 C186 112 186 140 196 140 M168 132 C182 132 184 164 196 164" />
<rect class="body teal" x="40" y="20" width="128" height="168" rx="18" />
<rect class="screen" x="56" y="34" width="96" height="40" rx="8" />
<path class="wave" d="M70 54 H138 M104 40 V68" />
{#each [0, 1, 2, 3, 4] as i (i)}
  <rect class="hi" x={56 + i * 20} y="86" width="14" height="88" rx="4" />
  <circle class="accent" cx={63 + i * 20} cy="100" r="4" />
{/each}
