<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 96];
</script>

<!-- the data centre's front door: a router box with a two-way arrow on top (in from the exchange, video back out) -->
<path class="wave" d="M58 42 H142 M128 30 L142 42 L128 54 M72 30 L58 42 L72 54" />
<rect class="body orange" x="28" y="62" width="144" height="92" rx="20" />
{#each [0, 1, 2, 3, 4] as i (i)}<rect class="screen" x={46 + i * 23} y="132" width="16" height="12" rx="3" />{/each}
<circle class="accent" cx="152" cy="80" r="6" />
