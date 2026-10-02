<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 62];
</script>

<!-- a 1990s desktop PC: a deep beige monitor on a flat box with a floppy slot, and a keyboard on a cable -->
<path class="line thin" d="M150 150 q14 6 8 16" />
<rect class="body" x="80" y="104" width="40" height="16" rx="4" />
<rect class="body" x="40" y="12" width="120" height="98" rx="16" />
<rect class="screen" x="53" y="25" width="94" height="72" rx="14" />
<path class="hi" d="M63 35 h36 l-13 22 H63 Z" />
<rect class="body" x="22" y="118" width="156" height="36" rx="8" />
<path class="line thin" d="M38 136 h42" />
<rect class="button" x="146" y="129" width="16" height="14" rx="4" />
<path class="body" d="M34 164 H166 L180 182 a6 6 0 0 1 -5 9 H25 a6 6 0 0 1 -5 -9 Z" />
<path class="line thin" d="M40 177 h120" />
