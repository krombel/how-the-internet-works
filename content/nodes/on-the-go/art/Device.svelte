<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [113, 114];
</script>

<!-- a phone on the move: it leans into its stride, with speed lines behind it -->
<path class="line" d="M20 72 H54" />
<path class="line thin" d="M10 106 H46" />
<path class="line" d="M22 140 H52" />
<g transform="rotate(12 116 100)">
  <rect class="body peach" x="76" y="20" width="80" height="160" rx="22" />
  <rect class="screen" x="87" y="38" width="58" height="106" rx="12" />
  <path class="hi" d="M99 51 h28 a7 7 0 0 1 7 7 v7 H99 Z" />
  <circle class="button" cx="116" cy="162" r="6" />
</g>
