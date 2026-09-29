<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 105];
</script>

<rect class="body berry" x="23" y="55" width="154" height="90" rx="22" />
{#each [0,1,2,3] as i}<circle class="accent" cx={52 + i * 32} cy="100" r="10" />{/each}
<path class="wave" d="M52 100 Q84 70 116 100 T148 100" />
