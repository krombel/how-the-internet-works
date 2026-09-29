<svelte:options namespace="svg" />
<script lang="ts">
  // The same house as at home, with a desk for the laptop to stand on.
  import { Depth, type PlaceBackdropProps } from '$core/api';
  import House from '../../home/art/Backdrop.svelte';
  let props: PlaceBackdropProps = $props();
  const desk = $derived(props.orient === 'portrait' ? { x: 150, w: 300, top: 1416, floor: 1536 } : { x: 290, w: 260, top: 656, floor: 740 });
</script>

<House {...props} />
<Depth d={1.03}>
  <g stroke="#6b3f2a" stroke-width="7" stroke-linejoin="round">
    <path d="M{desk.x + 22} {desk.top + 14} V{desk.floor} M{desk.x + desk.w - 22} {desk.top + 14} V{desk.floor}" fill="none" />
    <rect x={desk.x} y={desk.top} width={desk.w} height="20" rx="6" fill="#c98a55" />
  </g>
</Depth>
