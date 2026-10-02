<svelte:options namespace="svg" />
<script lang="ts">
  // The house with the desk, and the old telephone on its table: on dial-up the computer's modem borrows its line.
  import type { PlaceBackdropProps } from '$core/api';
  import Desk from '../../desk/art/Backdrop.svelte';
  import Telephone from '../../home-dsl/art/Telephone.svelte';
  let props: PlaceBackdropProps = $props();
</script>

<Desk {...props} />
<Telephone {...props.orient === 'portrait' ? { x: 600, top: 1440, floor: 1506 } : { x: 760, top: 664, floor: 728 }} />
