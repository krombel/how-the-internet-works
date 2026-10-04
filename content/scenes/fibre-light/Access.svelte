<svelte:options namespace="svg" />
<script lang="ts">
  // Access (GPON): one thread shared by a street. At the splitter the light coming home reaches every house (each
  // keeps only its own parcels); going up, the houses take turns so their flashes never bump into each other.
  import { TagAt, Text, pts, strings, view } from '$core/api';
  import { ACCESS, FIBRE, accessDrops, accessPulses, accessRoutes, toScene, trackMatrix } from './light';
  import Fibre from './art/Fibre.svelte';
  import Route from './art/Route.svelte';
  import Emitter from './art/Emitter.svelte';
  import Prism from './art/Prism.svelte';
  import Pulse from './art/Pulse.svelte';
  import House from './art/House.svelte';
  import Splitter from './art/Splitter.svelte';
  let { time }: { time: number } = $props();
  const S = strings('scene.fibre-light');
  const F = FIBRE, A = ACCESS;
  /** Channel 0 goes up (red), 1 comes home (blue). */
  // fixed-colour: each wavelength's own colour: light, the same by day and by night
  const colours = ['#e85d75', '#4aa3cf'];
  const routes = accessRoutes(), drops = accessDrops();
  const pulses = $derived(accessPulses(time, routes));
  const o = $derived(view.orient);
  const compact = $derived(o === 'landscape' && view.vp.h < 470);
  const houses = $derived(A.houses.map((y, i) => ({ ...toScene({ x: A.houseX, y }, o), you: i === A.you })));
  // Label positions per orientation (text stays upright; the track itself turns in portrait). Two-line labels: a gap.
  const L = $derived(o === 'portrait'
    ? { down: { x: 690, y: 520 }, up: { x: 690, y: 900 }, gap: 40, size: 28, split: { x: 230, y: 1215 }, you: { x: houses[A.you].x, y: 1565 }, tag: { x: 450, y: 1135 } }
    : { down: { x: 880, y: compact ? 150 : 170 }, up: { x: 880, y: compact ? 680 : 700 }, gap: compact ? 58 : 45, size: 32, split: { x: 420, y: 630 },
        // compact labels grow to the legibility floor, so "your home" moves beside the house instead of above it
        you: compact ? { x: houses[A.you].x + 250, y: houses[A.you].y - 60 } : { x: houses[A.you].x, y: 65 }, tag: { x: 880, y: 862 } });
</script>

<g transform={trackMatrix(o)}>
  {#each drops as d}
    <polyline points={pts(d)} fill="none" stroke="var(--line)" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" />
    <polyline points={pts(d)} fill="none" stroke="var(--glass)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
  {/each}
  <Fibre x0={A.x0} x1={F.x1} y={F.y} coreH={F.coreH} cladH={F.cladH} {time} />
  {#each routes.up as r}<Route points={r} channel={0} colour={colours[0]} />{/each}
  {#each routes.down as r}<Route points={r} channel={1} colour={colours[1]} />{/each}
  <Emitter x={F.detectorX} y={A.up} kind="detector" channel={0} colour={colours[0]} {time} />
  <!-- the light coming home starts on the right: mirror its laser -->
  <g transform="matrix(-1 0 0 1 1600 0)"><Emitter x={F.laserX} y={A.down} kind="laser" channel={1} colour={colours[1]} {time} /></g>
  <Prism x={F.demuxX} y={F.y} kind="demux" {time} />
  <Splitter x={A.splitX} y={F.y} {time} />
  {#each pulses as p}
    <Pulse head={p.head} trail={p.trail} channel={p.channel} colour={colours[p.channel]} {time} />
  {/each}
</g>
{#each houses as h}<House x={h.x} y={h.y} size={120} you={h.you} {time} />{/each}
<Text x={L.down.x} y={L.down.y} text={S('gpon.down')} size={L.size} kind="big" colour={colours[1]} />
<Text x={L.down.x} y={L.down.y + L.gap} text={S('gpon.everyone')} size={L.size - 4} kind="big" colour={colours[1]} />
<Text x={L.up.x} y={L.up.y} text={S('gpon.up')} size={L.size} kind="big" colour={colours[0]} />
<Text x={L.up.x} y={L.up.y + L.gap} text={S('gpon.turns')} size={L.size - 4} kind="big" colour={colours[0]} />
<Text x={L.split.x} y={L.split.y} text={S('gpon.splitter')} size={28} kind="big" />
<Text x={L.you.x} y={L.you.y} text={S('gpon.you')} size={26} kind="big" />
<TagAt x={L.tag.x} y={L.tag.y} text={S('tag.gpon')} size={24} fit />
