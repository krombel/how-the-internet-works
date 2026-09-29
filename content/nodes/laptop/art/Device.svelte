<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 86];
</script>

<rect class="body peach" x="34" y="30" width="132" height="104" rx="14" />
<rect class="screen" x="47" y="43" width="106" height="78" rx="8" />
<path class="hi" d="M58 53 h40 l-14 22 H58 Z" />
<path class="body orange" d="M22 138 H178 L190 162 a8 8 0 0 1 -7 11 H17 a8 8 0 0 1 -7 -11 Z" />
<rect class="button" x="84" y="147" width="32" height="10" rx="5" />
