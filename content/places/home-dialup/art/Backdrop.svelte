<svelte:options namespace="svg" />
<script lang="ts">
  // The house with the desk, and the old telephone on its table by the phone socket, its cord plugged in there: on
  // dial-up the computer's modem borrows the same line (issue 137: PC → modem → socket → street).
  import type { PlaceBackdropProps } from '$core/api';
  import place from '../place';
  import Desk from '../../desk/art/Backdrop.svelte';
  import Telephone from '../../home-dsl/art/Telephone.svelte';
  let props: PlaceBackdropProps = $props();
  const phone = $derived(props.orient === 'portrait' ? { x: 670, top: 1440, floor: 1506 } : { x: 930, top: 664, floor: 728 });
  const socket = $derived(place.layout?.overview?.[props.orient]?.props?.socket);
</script>

<Desk {...props} />
<!-- the cord, from the socket down behind the telephone (beneath it, so a little depth between them never shows) -->
{#if socket}
  <path d="M{socket[0]} {socket[1]} Q{socket[0] + 6} {phone.top - 10} {phone.x + 66} {phone.top - 20}" fill="none" stroke="var(--line)" stroke-width="5" stroke-linecap="round" />
{/if}
<Telephone {...phone} />
