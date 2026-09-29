<svelte:options namespace="svg" />
<script module lang="ts">
  /** Where a theme may draw a face (in the 200×200 box). */
  export const face: [number, number] = [100, 121];
</script>

<path class="line" d="M52 91 L36 38 M148 91 L164 38" />
<rect class="body orange" x="18" y="82" width="164" height="76" rx="24" />
<circle class="accent" cx="47" cy="122" r="7" /><circle class="accent" cx="70" cy="122" r="7" /><circle class="accent" cx="93" cy="122" r="7" />
<path class="hi" d="M36 94 h102 a10 10 0 0 1 10 10 v8 H36 Z" />
