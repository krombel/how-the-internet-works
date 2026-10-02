<svelte:options namespace="svg" />
<script lang="ts">
  // The same house as at home, with an old telephone on a little table: it shares the copper phone line with the
  // router's modem (the call down low, the data up high).
  import type { PlaceBackdropProps } from '$core/api';
  import House from '../../home/art/Backdrop.svelte';
  import Telephone from './Telephone.svelte';
  let props: PlaceBackdropProps = $props();
</script>

<House {...props} />
<Telephone {...props.orient === 'portrait' ? { x: 360, top: 1440, floor: 1506 } : { x: 760, top: 664, floor: 728 }} />
