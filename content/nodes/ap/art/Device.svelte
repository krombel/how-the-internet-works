<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 146];
</script>

<path class="line" d="M56 120 L42 46 M144 120 L158 46" />
<circle class="accent" cx="42" cy="46" r="11" /><circle class="accent" cx="158" cy="46" r="11" />
<rect class="body teal" x="24" y="112" width="152" height="58" rx="24" />
<path class="wave" d="M78 101 A30 30 0 0 1 122 101 M66 88 A48 48 0 0 1 134 88" />
