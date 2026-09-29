<svelte:options namespace="svg" />
<script lang="ts">
  // Look inside a fibre link: light bouncing along a glass core. On a GPON access fibre it shows the two colours
  // (up the street, coming home); anywhere else it shows DWDM's many colours going the same way.
  import { TagAt, Text, strings, view, type Subject } from '$core/api';
  import { DWDM, FIBRE, GPON, channelRoute, fibrePulses, trackMatrix } from './light';
  import Fibre from './art/Fibre.svelte';
  import Route from './art/Route.svelte';
  import Emitter from './art/Emitter.svelte';
  import Prism from './art/Prism.svelte';
  import Pulse from './art/Pulse.svelte';
  let { subject }: { subject: Subject } = $props();
  const S = strings('scene.fibre-light');
  const F = FIBRE;
  const gpon = $derived(subject.link.tech.id === 'gpon');
  const channels = $derived(gpon ? GPON : DWDM);
  const colours = $derived(gpon ? ['#e85d75', '#4aa3cf'] : ['#e85d75', '#ffcf5d', '#55bfa3', '#4aa3cf']);
  const routes = $derived(channels.map((c, i) => channelRoute(i, c)));
  const pulses = $derived(fibrePulses(view.time, routes));
  const o = $derived(view.orient);
  // Label positions per orientation (text stays upright; the track itself turns in portrait).
  const L = $derived(o === 'portrait'
    ? { channels: null, core: { x: 210, y: 900 }, clad: { x: 690, y: 640 }, mux: { x: 690, y: 1440 }, demux: { x: 690, y: 185 }, up: { x: 160, y: 1260 }, down: { x: 160, y: 560 } }
    : { channels: { x: 800, y: 120 }, core: { x: 600, y: 285 }, clad: { x: 1000, y: 655 }, mux: { x: 230, y: 790 }, demux: { x: 1370, y: 790 }, up: { x: 470, y: 150 }, down: { x: 1130, y: 150 } });
</script>

<g transform={trackMatrix(o)}>
  <Fibre x0={F.x0} x1={F.x1} y={F.y} coreH={F.coreH} cladH={F.cladH} time={view.time} />
  {#each routes as r, i}<Route points={r} channel={i} colour={colours[i]} />{/each}
  {#each channels as c, i}
    <!-- a right → left channel has its laser on the right: mirror the pair -->
    <g transform={c.reverse ? 'matrix(-1 0 0 1 1600 0)' : undefined}>
      <Emitter x={F.laserX} y={c.y} kind="laser" channel={i} colour={colours[i]} time={view.time} />
      <Emitter x={F.detectorX} y={c.y} kind="detector" channel={i} colour={colours[i]} time={view.time} />
    </g>
  {/each}
  <Prism x={F.muxX} y={F.y} kind="mux" time={view.time} />
  <Prism x={F.demuxX} y={F.y} kind="demux" time={view.time} />
  {#each pulses as p}
    <Pulse head={p.head} trail={p.trail} channel={p.channel} colour={colours[p.channel]} time={view.time} />
  {/each}
</g>
{#if gpon}
  <Text x={L.up.x} y={L.up.y} text={S('up')} size={32} kind="big" colour={colours[0]} />
  <Text x={L.down.x} y={L.down.y} text={S('down')} size={32} kind="big" colour={colours[1]} />
{:else if L.channels}
  <!-- portrait has no room for the long heading beside the thread; the caption says it instead -->
  <Text x={L.channels.x} y={L.channels.y} text={S('channels')} size={36} kind="big" />
{/if}
<Text x={L.core.x} y={L.core.y} text={S('core')} size={30} kind="big" />
<Text x={L.clad.x} y={L.clad.y} text={S('cladding')} size={30} kind="big" />
{#if !gpon}
  <Text x={L.mux.x} y={L.mux.y} text={S('mux')} size={28} kind="big" />
  <Text x={L.demux.x} y={L.demux.y} text={S('demux')} size={28} kind="big" />
{/if}
<TagAt x={o === 'portrait' ? 690 : 800} y={o === 'portrait' ? 1240 : 860} text={S(gpon ? 'tag.gpon' : 'tag.dwdm')} size={24} />
