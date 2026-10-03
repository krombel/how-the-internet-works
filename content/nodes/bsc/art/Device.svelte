<svelte:options namespace="svg" />
<script module lang="ts">
  export const face: [number, number] = [100, 108];
</script>

<!-- two cabinets side by side, full of switching cards in rows, and the lines from its masts in at the top -->
<path class="line thin" d="M50 30 L66 50 M86 22 V50 M114 22 V50 M150 30 L134 50" />
<circle class="accent" cx="50" cy="30" r="5" /><circle class="accent" cx="86" cy="22" r="5" />
<circle class="accent" cx="114" cy="22" r="5" /><circle class="accent" cx="150" cy="30" r="5" />
<rect class="body teal" x="28" y="50" width="144" height="138" rx="16" />
<path class="line thin" d="M100 128 V180" />
<g class="hi">
  {#each [0, 1, 2, 3] as r (r)}
    <rect x="40" y={132 + r * 12} width="50" height="7" rx="3" />
    <rect x="110" y={132 + r * 12} width="50" height="7" rx="3" />
  {/each}
</g>
