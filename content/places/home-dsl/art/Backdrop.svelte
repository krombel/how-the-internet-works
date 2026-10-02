<svelte:options namespace="svg" />
<script lang="ts">
  // The same house as at home, with an old telephone on a little table: it shares the copper phone line with the
  // router's modem (the call down low, the data up high).
  import { Depth, type PlaceBackdropProps } from '$core/api';
  import House from '../../home/art/Backdrop.svelte';
  let props: PlaceBackdropProps = $props();
  // the table's left edge, its top and the floor
  const t = $derived(props.orient === 'portrait' ? { x: 360, top: 1440, floor: 1506 } : { x: 760, top: 664, floor: 728 });
</script>

<House {...props} />
<Depth d={1.03}>
  <g stroke="var(--line)" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">
    <path d="M{t.x + 16} {t.top + 12} V{t.floor} M{t.x + 104} {t.top + 12} V{t.floor}" fill="none" />
    <rect x={t.x} y={t.top} width="120" height="16" rx="5" fill="var(--cardboard)" />
    <!-- the telephone: its body, the dial, and the handset resting on top -->
    <path d="M{t.x + 26} {t.top} L{t.x + 36} {t.top - 38} H{t.x + 84} L{t.x + 94} {t.top} Z" fill="var(--berry)" />
    <circle cx={t.x + 60} cy={t.top - 19} r="11" fill="var(--paper)" stroke-width="4" />
    <path d="M{t.x + 22} {t.top - 46} Q{t.x + 60} {t.top - 62} {t.x + 98} {t.top - 46} L{t.x + 94} {t.top - 38} H{t.x + 26} Z" fill="var(--berry)" />
  </g>
</Depth>
