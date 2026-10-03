<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 50];
</script>

<!-- a rack of modem cards side by side, each with its two little lights, and the phone lines in at the bottom -->
<path class="line thin" d="M70 172 V192 M100 172 V196 M130 172 V192" />
<rect class="body orange" x="30" y="24" width="140" height="150" rx="18" />
<rect class="screen" x="62" y="38" width="76" height="26" rx="6" />
{#each [0, 1, 2, 3, 4, 5] as i (i)}
  <rect class="hi" x={44 + i * 19} y="76" width="12" height="84" rx="4" />
  <circle class="accent" cx={50 + i * 19} cy="90" r="4" />
  <circle class="accent" cx={50 + i * 19} cy="104" r="4" />
{/each}
