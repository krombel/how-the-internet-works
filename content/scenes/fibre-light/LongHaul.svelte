<svelte:options namespace="svg" />
<script lang="ts">
  // Long haul (backbone): many thinner colours on a thread hundreds of kilometres long. The light fades through each
  // span and a booster makes every colour bright again at once.
  import { TagAt, Text, strings, view } from '$core/api';
  import { FIBRE, LONG_HAUL, channelRoute, fadeAt, fibrePulses, milestones, toScene, trackMatrix } from './light';
  import Fibre from './art/Fibre.svelte';
  import Route from './art/Route.svelte';
  import Emitter from './art/Emitter.svelte';
  import Prism from './art/Prism.svelte';
  import Pulse from './art/Pulse.svelte';
  import Amplifier from './art/Amplifier.svelte';
  import Break from './art/Break.svelte';
  const S = strings('scene.fibre-light');
  const F = FIBRE, H = LONG_HAUL;
  const colours = ['#e85d75', '#f08a4b', '#ffcf5d', '#a8c957', '#55bfa3', '#4aa3cf', '#7f7fd5', '#c77dbb'];
  const routes = H.lanes.map((c, i) => channelRoute(i, c));
  const pulses = $derived(fibrePulses(view.time, routes, 2));
  const o = $derived(view.orient);
  const portrait = $derived(o === 'portrait');
  /** Booster labels and km markers beside the thread (upright, in scene coordinates). */
  const boosters = $derived(H.amps.map((x) => toScene({ x, y: portrait ? 190 : 300 }, o)));
  const km = $derived(milestones().map((m) => ({ ...toScene({ x: m.x, y: portrait ? 700 : 625 }, o), km: m.km })));
  // portrait: across the thread (callouts are wider than the space beside it on a phone)
  const tag = $derived(portrait ? { x: 450, y: 1190 } : { x: 800, y: 862 });
</script>

<g transform={trackMatrix(o)}>
  <Fibre x0={F.x0} x1={F.x1} y={F.y} coreH={F.coreH} cladH={F.cladH} time={view.time} />
  {#each H.breaks as x}<Break {x} y={F.y} h={F.cladH} />{/each}
  {#each routes as r, i}<Route points={r} channel={i} colour={colours[i]} size={0.6} />{/each}
  {#each H.lanes as c, i}
    <Emitter x={F.laserX} y={c.y} kind="laser" channel={i} colour={colours[i]} time={view.time} size={0.62} />
    <Emitter x={F.detectorX} y={c.y} kind="detector" channel={i} colour={colours[i]} time={view.time} size={0.62} />
  {/each}
  <Prism x={F.muxX} y={F.y} kind="mux" time={view.time} />
  <Prism x={F.demuxX} y={F.y} kind="demux" time={view.time} />
  {#each pulses as p}
    <Pulse head={p.head} trail={p.trail} channel={p.channel} colour={colours[p.channel]} time={view.time} fade={fadeAt(p.head.x)} size={0.65} />
  {/each}
  <!-- over the light: it goes in faint and comes out bright -->
  {#each H.amps as x}<Amplifier {x} y={F.y} time={view.time} />{/each}
</g>
{#each boosters as b}<Text x={b.x} y={b.y} text={S('backbone.booster')} size={28} kind="big" />{/each}
{#each km as m}<Text x={m.x} y={m.y} text={`${m.km} km`} size={26} kind="big" />{/each}
<TagAt x={tag.x} y={tag.y} text={S('tag.backbone')} size={24} />
