<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 118];
</script>

<!-- a flat-roofed hall with a cooling unit on top and a rack of blinking servers showing through each window -->
<rect class="body teal" x="70" y="36" width="60" height="22" rx="6" />
<path class="line thin" d="M84 47 H116" />
<rect class="body peach" x="26" y="56" width="148" height="112" rx="14" />
{#each [40, 132] as x (x)}
  <rect class="screen" {x} y="74" width="28" height="78" rx="5" />
  <path class="line thin" d={`M${x + 4} 94 H${x + 24} M${x + 4} 113 H${x + 24} M${x + 4} 132 H${x + 24}`} />
  {#each [85, 104, 123, 142] as y (y)}<circle class="accent" cx={x + 8} cy={y} r="3.5" />{/each}
{/each}
