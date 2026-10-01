<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 56];
</script>

<!-- a tall rack of servers with its switch on top (top of rack) -->
<rect class="body peach" x="46" y="20" width="108" height="164" rx="12" />
<rect class="body teal" x="54" y="28" width="92" height="58" rx="9" />
{#each [98, 124, 150] as y (y)}
  <rect class="screen" x="58" {y} width="84" height="20" rx="4" />
  <circle class="accent" cx="70" cy={y + 10} r="4" />
  <path class="line thin" d={`M84 ${y + 10} H132`} />
{/each}
