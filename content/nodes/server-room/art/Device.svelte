<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [62, 132];
</script>

<!-- a small brick building; through its wide window, a shelf with two beige tower computers -->
<rect class="body peach" x="22" y="48" width="156" height="128" rx="12" />
<path class="line thin" d="M22 68 H178 M40 48 V68 M80 48 V68 M120 48 V68 M160 48 V68" />
<rect class="screen" x="96" y="84" width="68" height="64" rx="8" />
<path class="line thin" d="M102 136 H158" />
<rect class="body" x="108" y="96" width="18" height="40" rx="3" />
<rect class="body" x="134" y="96" width="18" height="40" rx="3" />
<circle class="accent" cx="117" cy="126" r="3" />
<circle class="accent" cx="143" cy="126" r="3" />
<rect class="cloud" x="104" y="150" width="56" height="26" rx="4" />
<path class="line thin" d="M104 163 H160" />
