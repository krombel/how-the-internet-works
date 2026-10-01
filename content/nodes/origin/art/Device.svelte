<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 136];
</script>

<!-- the main copy: a store of disks (three copies) under a cloud, far away -->
<path class="body cloud" d="M48 92 H152 A26 26 0 0 0 144 42 A36 36 0 0 0 80 34 A32 32 0 0 0 48 92 Z" />
<path class="body teal" d="M50 100 V162 A50 15 0 0 0 150 162 V100 Z" />
<ellipse class="body teal" cx="100" cy="100" rx="50" ry="15" />
{#each [0, 1, 2] as i (i)}<circle class="accent" cx={68 + i * 12} cy="60" r="5" />{/each}
