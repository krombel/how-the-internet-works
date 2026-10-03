<svelte:options namespace="svg" />
<script lang="ts">
  // The same street as today: the shops, the lamp post and the road were there in 2010 too.
  import type { PlaceBackdropProps } from '$core/api';
  import Street from '../../street/art/Backdrop.svelte';
  let props: PlaceBackdropProps = $props();
</script>

<Street {...props} />
