<svelte:options namespace="svg" />
<script module lang="ts">
  import { face as routerFace } from '../../router/art/Device.svelte';
  /** Where a theme may draw a face (in the 200×200 box): the same box as the home router's. */
  export const face: [number, number] = routerFace;
</script>
<script lang="ts">
  import Router from '../../router/art/Device.svelte';
</script>

<Router />
