<svelte:options namespace="svg" />
<script module lang="ts">
  export const face: [number, number] = [100, 130];
</script>

<!-- the mobile network's own building: a rack-house with a little mast on the roof -->
<path class="line" d="M146 46 V20" />
<path class="wave" d="M130 14 A20 20 0 0 1 162 14" />
<circle class="accent" cx="146" cy="20" r="7" />
<rect class="body teal" x="24" y="46" width="152" height="130" rx="26" />
<path class="hi" d="M40 58 h110 a10 10 0 0 1 10 10 v6 H40 Z" />
<rect class="screen" x="42" y="78" width="116" height="28" rx="8" />
<path class="line thin" d="M56 92 H84 M96 92 H112 M124 92 H144" />
<circle class="accent" cx="46" cy="156" r="6" /><circle class="accent" cx="154" cy="156" r="6" />
