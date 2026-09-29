<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 128];
</script>

<path class="body peach" d="M34 90 L100 35 L166 90 V166 H34 Z" />
<path class="roof" d="M24 96 L100 30 L176 96" />
<rect class="screen" x="78" y="112" width="44" height="54" rx="6" />
