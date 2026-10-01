<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 88];
</script>

<path class="body peach" d="M34 90 L100 35 L166 90 V166 H34 Z" />
<path class="roof" d="M24 96 L100 30 L176 96" />
<rect class="screen" x="80" y="120" width="40" height="46" rx="6" />
