<svelte:options namespace="svg" />
<script module lang="ts">
  export const face: [number, number] = [72, 96];
</script>

<!-- the mobile switch: a big switch cabinet, and beside it its rack of modems (the IWF), each card with its lights -->
<path class="line thin" d="M50 30 L60 46 M84 26 V46 M146 54 V70" />
<rect class="body berry" x="18" y="44" width="108" height="146" rx="16" />
<rect class="screen" x="34" y="148" width="76" height="22" rx="6" />
<path class="line thin" d="M44 159 H78" />
<rect class="body orange" x="132" y="68" width="54" height="122" rx="12" />
{#each [0, 1, 2] as i (i)}
  <rect class="hi" x={140 + i * 15} y="80" width="10" height="96" rx="4" />
  <circle class="accent" cx={145 + i * 15} cy="94" r="3.5" />
  <circle class="accent" cx={145 + i * 15} cy="108" r="3.5" />
{/each}
