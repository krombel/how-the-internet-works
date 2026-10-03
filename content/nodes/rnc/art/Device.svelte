<svelte:options namespace="svg" />
<script module lang="ts">
  export const face: [number, number] = [100, 120];
</script>

<!-- a tall equipment cabinet with rows of line cards, and the lines to its masts fanning in at the top -->
<path class="line thin" d="M60 24 L84 46 M100 18 V46 M140 24 L116 46" />
<circle class="accent" cx="60" cy="24" r="6" /><circle class="accent" cx="100" cy="18" r="6" /><circle class="accent" cx="140" cy="24" r="6" />
<rect class="body berry" x="50" y="46" width="100" height="140" rx="18" />
<path class="hi" d="M62 56 h68 a8 8 0 0 1 8 8 v4 H62 Z" />
<rect class="screen" x="64" y="78" width="72" height="18" rx="5" />
<rect class="screen" x="64" y="146" width="72" height="18" rx="5" />
<path class="line thin" d="M74 87 H96 M74 155 H96" />
