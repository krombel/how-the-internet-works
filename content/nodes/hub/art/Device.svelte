<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 84];
</script>

<!-- a flat hub: a row of eight ports with a light over each, and grey cables hanging out of the ports in use -->
<path class="line thin" d="M42 142 C42 166 30 172 26 190 M66 142 C66 168 74 176 80 192 M114 142 C114 170 128 178 138 192" />
<rect class="body teal" x="16" y="62" width="168" height="82" rx="14" />
{#each [0, 1, 2, 3, 4, 5, 6, 7] as i (i)}
  <rect class="screen" x={30 + i * 18.5} y="112" width="12" height="18" rx="2" />
  <circle class={i === 0 || i === 2 || i === 5 ? 'accent' : 'hi'} cx={36 + i * 18.5} cy="102" r="3.5" />
{/each}
