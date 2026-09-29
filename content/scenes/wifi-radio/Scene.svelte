<svelte:options namespace="svg" />
<script lang="ts">
  // Look inside a Wi-Fi link: bits riding a radio wave, from the access point to the device.
  import { Node, Text, strings, view, type LinkSubject } from '$core/api';
  import { WIFI, toScene, trackMatrix, wifiBits, wifiRings, wifiWave } from './wave';
  import Wave from './art/Wave.svelte';
  import Bit from './art/Bit.svelte';
  import Rings from './art/Rings.svelte';
  let { subject }: { subject: LinkSubject } = $props();
  const S = strings('scene.wifi-radio');
  const BIT_COLOURS = ['#72b8a5', '#f28f5b'];
  // the device end and the radio end of the link (phone ↔ access point on the home route)
  const device = $derived(subject.route.hops[subject.link.from].node.id);
  const radio = $derived(subject.route.hops[subject.link.to].node.id);
  const o = $derived(view.orient);
  const wave = $derived(wifiWave(view.time));
  const d = $derived('M' + wave.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
  const phone = $derived(toScene({ x: WIFI.phoneX, y: WIFI.y }, o));
  const ap = $derived(toScene({ x: WIFI.apX, y: WIFI.y }, o));
  const ringC = $derived(toScene({ x: WIFI.apX - 78, y: WIFI.y - 78 }, o));
  const bits = $derived(wifiBits(view.time).map((b) => {
    const top = { x: b.x, y: WIFI.bitsY }, foot = { x: b.x, y: WIFI.y - (b.bit ? WIFI.ampOne : WIFI.ampZero) - 16 };
    const stemA = { x: b.x, y: WIFI.bitsY + 36 };
    return { ...b, p: toScene(top, o), stem: [toScene(stemA, o), toScene(foot, o)] as [typeof top, typeof top] };
  }));
  const L = $derived(o === 'portrait'
    ? { bits: { x: 150, y: 820 }, carrier: { x: 700, y: 820 } }
    : { bits: { x: 815, y: 175 }, carrier: { x: 815, y: 690 } });
</script>

<Rings cx={ringC.x} cy={ringC.y} rings={wifiRings(view.time)} time={view.time} />
<Node id={device} x={phone.x} y={phone.y} size={330} />
<Node id={radio} x={ap.x} y={ap.y} size={300} />
<g transform={trackMatrix(o)}>
  <Wave {d} points={wave} time={view.time} />
</g>
{#each bits as b (b.key)}
  <Bit x={b.p.x} y={b.p.y} bit={b.bit} alpha={b.alpha} stem={b.stem} time={view.time} colour={BIT_COLOURS[b.bit]} />
{/each}
<Text x={L.bits.x} y={L.bits.y} text={S('bits')} size={34} kind="big" />
<Text x={L.carrier.x} y={L.carrier.y} text={S('carrier')} size={34} kind="big" colour={subject.link.tech.colour} />
