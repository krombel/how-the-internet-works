<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [70, 80];
</script>

<!-- a thick 1995 laptop with a small screen in a wide bezel, a data card in its side, and a curly cable to a brick of a
     GSM phone with a stubby aerial standing beside it -->
<path class="line thin" d="M136 150 c10 0 6 12 12 12 s4 -12 10 -12 s4 12 10 12 s6 -6 6 -10" />
<rect class="body" x="16" y="34" width="108" height="96" rx="14" />
<rect class="screen" x="30" y="48" width="80" height="62" rx="6" />
<path class="hi" d="M38 56 h30 l-11 18 H38 Z" />
<path class="body" d="M14 132 H126 L136 166 a6 6 0 0 1 -6 8 H10 a6 6 0 0 1 -6 -8 Z" />
<path class="line thin" d="M24 148 h92 M20 158 h100" />
<rect class="button" x="126" y="144" width="14" height="10" rx="3" />
<path class="line" d="M178 76 V40" />
<circle class="accent" cx="178" cy="38" r="5" />
<rect class="body orange" x="148" y="70" width="38" height="96" rx="10" />
<rect class="screen" x="154" y="80" width="26" height="18" rx="4" />
<g class="hi">
  {#each [0, 1, 2] as r (r)}
    {#each [0, 1, 2] as c (c)}<rect x={155 + c * 9} y={108 + r * 12} width="6" height="7" rx="2" />{/each}
  {/each}
</g>
