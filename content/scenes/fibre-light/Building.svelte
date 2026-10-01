<svelte:options namespace="svg" />
<script lang="ts">
  // Fibre to the building: a thread of the building's own from the basement (left) to the ISP (right). Light going up
  // and light coming down share it in two colours, each from its own laser to its own detector (a BiDi optic).
  import { TagAt, Text, strings, view } from '$core/api';
  import { BUILDING, FIBRE, channelRoute, fibrePulses, trackMatrix } from './light';
  import Fibre from './art/Fibre.svelte';
  import Route from './art/Route.svelte';
  import Emitter from './art/Emitter.svelte';
  import Prism from './art/Prism.svelte';
  import Pulse from './art/Pulse.svelte';
  const S = strings('scene.fibre-light');
  const F = FIBRE, [UP, DOWN] = BUILDING;
  /** Channel 0 goes up (red), 1 comes down (blue). */
  // fixed-colour: each wavelength's own colour: light, the same by day and by night
  const colours = ['#e85d75', '#4aa3cf'];
  const routes = BUILDING.map((c, i) => channelRoute(i, c));
  const pulses = $derived(fibrePulses(view.time, routes));
  const o = $derived(view.orient);
  const compact = $derived(o === 'landscape' && view.vp.h < 470);
  // Label positions per orientation (text stays upright; the track itself turns in portrait). Two-line labels: a gap.
  const L = $derived(o === 'portrait'
    ? { up: { x: 690, y: 520 }, down: { x: 690, y: 900 }, gap: 40, size: 28, tag: { x: 450, y: 1135 } }
    : { up: { x: 800, y: compact ? 150 : 170 }, down: { x: 800, y: compact ? 680 : 700 }, gap: compact ? 58 : 45, size: 32, tag: { x: 800, y: 862 } });
</script>

<g transform={trackMatrix(o)}>
  <Fibre x0={F.x0} x1={F.x1} y={F.y} coreH={F.coreH} cladH={F.cladH} time={view.time} />
  {#each routes as r, i}<Route points={r} channel={i} colour={colours[i]} />{/each}
  <Emitter x={F.laserX} y={UP.y} kind="laser" channel={0} colour={colours[0]} time={view.time} />
  <Emitter x={F.detectorX} y={UP.y} kind="detector" channel={0} colour={colours[0]} time={view.time} />
  <!-- the light coming down starts on the right: mirror its laser and its detector -->
  <g transform="matrix(-1 0 0 1 1600 0)">
    <Emitter x={F.laserX} y={DOWN.y} kind="laser" channel={1} colour={colours[1]} time={view.time} />
    <Emitter x={F.detectorX} y={DOWN.y} kind="detector" channel={1} colour={colours[1]} time={view.time} />
  </g>
  <Prism x={F.muxX} y={F.y} kind="mux" time={view.time} />
  <Prism x={F.demuxX} y={F.y} kind="demux" time={view.time} />
  {#each pulses as p}
    <Pulse head={p.head} trail={p.trail} channel={p.channel} colour={colours[p.channel]} time={view.time} />
  {/each}
</g>
<Text x={L.up.x} y={L.up.y} text={S('fttb.up')} size={L.size} kind="big" colour={colours[0]} />
<Text x={L.up.x} y={L.up.y + L.gap} text={S('fttb.upColour')} size={L.size - 4} kind="big" colour={colours[0]} />
<Text x={L.down.x} y={L.down.y} text={S('fttb.down')} size={L.size} kind="big" colour={colours[1]} />
<Text x={L.down.x} y={L.down.y + L.gap} text={S('fttb.downColour')} size={L.size - 4} kind="big" colour={colours[1]} />
<TagAt x={L.tag.x} y={L.tag.y} text={S('tag.fttb')} size={24} />
