<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 64];
</script>

<!-- a beige tower computer: two drive bays and a floppy slot at the top, a power button and its light, and air holes -->
<rect class="body" x="54" y="10" width="92" height="180" rx="12" />
<rect class="screen" x="66" y="28" width="68" height="16" rx="3" />
<rect class="screen" x="66" y="92" width="68" height="16" rx="3" />
<path class="line thin" d="M78 122 H122" />
<rect class="button" x="70" y="138" width="16" height="12" rx="3" />
<circle class="accent" cx="112" cy="144" r="5" />
<path class="line thin" d="M68 164 H132 M68 174 H132" />
<path class="body" d="M48 188 H152 V196 H48 Z" />
