<svelte:options namespace="svg" />
<script lang="ts">
  // Look inside the home router: the switch's cable sockets, the Wi‑Fi radio, the brain (routing and NAT) and the
  // fibre ONT. A parcel comes in on the link before (electric pushes on a cable), is plain bits inside, has its sender
  // swapped by the brain and leaves on the link after (as light on the fibre): the rooms it uses follow those links.
  import { Node, Text, fill, nameOf, strings, view, type NodeSubject } from '$core/api';
  import { centre, formFor, parcelAt, roomFor, routerLayout, tripPath } from './router';
  import type { Look, Room as RoomId } from './types';
  import Case from './art/Case.svelte';
  import Room from './art/Room.svelte';
  import Carrier from './art/Carrier.svelte';

  let { subject }: { subject: NodeSubject } = $props();
  const S = strings('scene.router-inside');
  const o = $derived(view.orient);
  const portrait = $derived(o === 'portrait');
  const compact = $derived(o === 'landscape' && view.vp.h < 470);
  const night = $derived(view.mode === 'night');
  const L = $derived(routerLayout(o));
  const T = $derived(portrait ? { head: 34, body: 30, sticker: 28 } : compact ? { head: 32, body: 0, sticker: 24 } : { head: 27, body: 23, sticker: 19 });

  const before = $derived(subject.in ? subject.route.hops[subject.in.from] : null);
  const after = $derived(subject.out ? subject.route.hops[subject.out.to] : null);
  // a route always has a link on at least one side of a hop; with none on one side, the parcel comes in and goes out the same way
  const inLink = $derived((subject.in ?? subject.out)!);
  const outLink = $derived((subject.out ?? subject.in)!);
  const inRoom = $derived(roomFor(inLink.tech.look as Look));
  const outRoom = $derived(roomFor(outLink.tech.look as Look));
  const path = $derived(tripPath(L, inLink.tech.look as Look, outLink.tech.look as Look));
  const parcel = $derived(parcelAt(view.time, view.still, path));
  const onLink = $derived(parcel.stage === 'in' ? inLink : parcel.stage === 'out' ? outLink : null);

  const client = $derived(subject.route.chain[0]);
  const stickers = $derived(S('mode') === 'nerd'
    ? [client.addr ?? '', subject.hop.natTo ?? subject.hop.addr ?? '']
    : [nameOf(client), S('outside')].map((who) => fill(S('from'), { who })));
  const used = (r: RoomId) => r === 'brain' || r === inRoom || r === outRoom;
  const line = (r: RoomId) => (compact ? '' : S(`${r}.${used(r) ? 'line' : 'idle'}`));
  const tints: Record<RoomId, string> = { switch: 'var(--orange)', wifi: 'var(--teal)', brain: 'var(--berry)', ont: 'var(--blue)' };
  const ROOMS: RoomId[] = ['switch', 'wifi', 'brain', 'ont'];
  const wire = (a: { x: number; y: number }, b: { x: number; y: number }) => `M${a.x} ${a.y} L${b.x} ${b.y}`;
  const linkName = (id: string) => strings(`tech.${id}`)('name');
</script>

<!-- geometric text: the camera scales this panel every frame, and hinted text would be laid out again each time -->
<g text-rendering="geometricPrecision">
  {#if !portrait}<text x="800" y={compact ? 110 : 120} text-anchor="middle" font-family="var(--label-font)" font-size={compact ? 44 : 42} font-weight="900" fill="var(--line)" stroke="var(--paper)" stroke-width="7" paint-order="stroke">{S('title')}</text>{/if}

  <!-- the links either side, in their technologies' colours: the medium changes inside the box -->
  {#each [[path[0], path[1], inLink], [path[path.length - 2], path[path.length - 1], outLink]] as const as [a, b, l], i (i)}
    <path d={wire(a, b)} stroke="var(--line)" stroke-width="30" stroke-linecap="round" />
    <path d={wire(a, b)} stroke={l.tech.colour} stroke-width="18" stroke-linecap="round" stroke-dasharray={l.tech.look === 'radio' ? '4 26' : undefined} />
    {#if night}<path d={wire(a, b)} stroke={l.tech.colour} stroke-width="54" stroke-linecap="round" opacity="0.18" />{/if}
  {/each}
  <Case box={L.case} antennas={L.antennas} time={view.time} {night} />
  <!-- inside: the wires between the rooms it passes through -->
  <path d={`M${path.slice(1, -1).map((p) => `${p.x} ${p.y}`).join(' L')}`} fill="none" stroke="var(--line)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" opacity="0.45" />
  {#each ROOMS as r (r)}
    {@const b = L.rooms[r]}
    {@const c = centre(b)}
    {@const top = b.y + T.head * 1.9}
    {@const mid = (top + b.y + b.h - (T.body ? T.body * 1.9 : 0)) / 2}
    <Room box={b} tint={tints[r]} title={S(`${r}.title`)} line={line(r)} used={used(r)} head={T.head} body={T.body}>
      {#if r === 'switch'}
        <!-- four cable sockets; the one the cable comes in by is lit -->
        {#each [0, 1, 2, 3] as k (k)}
          {@const sx = c.x + (k - 1.5) * (portrait ? 110 : 54)}
          <rect x={sx - 21} y={mid - 22} width="42" height="40" rx="5" fill={k === 0 && used(r) ? inLink.tech.colour : 'var(--paper-2)'} stroke="var(--line)" stroke-width="5" />
          <rect x={sx - 9} y={mid + 10} width="18" height="10" fill="var(--line)" />
        {/each}
      {:else if r === 'wifi'}
        {#each [1, 2, 3] as k (k)}
          <path d={`M${c.x - k * 22} ${mid + 14 - k * 6} A${k * 31} ${k * 31} 0 0 1 ${c.x + k * 22} ${mid + 14 - k * 6}`} fill="none" stroke="var(--teal)" stroke-width="8" stroke-linecap="round" />
        {/each}
        <circle cx={c.x} cy={mid + 18} r="9" fill="var(--line)" />
      {:else if r === 'brain'}
        <!-- the sender's sticker, before and after the brain swaps it -->
        {#each stickers as s, k (k)}
          {@const sy = mid + (k ? 1 : -1) * T.sticker * 1.25}
          {@const on = k === 1 ? parcel.swapped : !parcel.swapped}
          <rect x={b.x + 18} y={sy - T.sticker * 0.85} width={b.w - 36} height={T.sticker * 1.7} rx="8" fill={on ? 'var(--kraft)' : 'var(--paper-2)'} stroke="var(--line)" stroke-width="4" />
          <text x={c.x} y={sy + T.sticker * 0.36} text-anchor="middle" font-family={S('mode') === 'nerd' ? 'var(--tag-font)' : 'var(--label-font)'} font-size={T.sticker} font-weight="800" fill="var(--line)" text-decoration={k === 0 && parcel.swapped ? 'line-through' : undefined}>{s}</text>
        {/each}
      {:else}
        <!-- electric pushes in, flashes of light out -->
        <Carrier p={{ x: c.x - (portrait ? 110 : 68), y: mid }} form="spark" colour="var(--sun)" alpha={1} time={0} night={false} />
        <path d={`M${c.x - 30} ${mid} H${c.x + 22} m-14 -14 l14 14 l-14 14`} fill="none" stroke="var(--line)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
        <Carrier p={{ x: c.x + (portrait ? 110 : 68), y: mid }} form="light" colour="var(--teal)" alpha={1} time={0} night={false} />
      {/if}
    </Room>
  {/each}

  <Carrier p={parcel.p} form={onLink ? formFor(onLink.tech.look as Look) : 'parcel'} colour={onLink?.tech.colour ?? ''} alpha={parcel.alpha} time={view.time} {night} />

  {#if before}
    <Node id={before.node.id} x={L.inNode.x} y={L.inNode.y} size={L.nodeSize} />
    {#if !compact}<Text x={L.inLabel.x} y={L.inLabel.y} text={nameOf(before)} size={portrait ? 32 : 25} kind="node" />{/if}
  {/if}
  {#if after}
    <Node id={after.node.id} x={L.outNode.x} y={L.outNode.y} size={L.nodeSize} />
    {#if !compact}<Text x={L.outLabel.x} y={L.outLabel.y} text={nameOf(after)} size={portrait ? 32 : 25} kind="node" />{/if}
  {/if}
  {#if !compact}
    {#each [[path[0], path[1], inLink], [path[path.length - 2], path[path.length - 1], outLink]] as const as [a, b, l], i (i)}
      <Text x={(a.x + b.x) / 2 - (portrait ? 34 : 0)} y={(a.y + b.y) / 2 + (portrait ? 10 : -30)} text={linkName(l.tech.id)} size={portrait ? 30 : 24} kind="link" colour={l.tech.colour} anchor={portrait ? 'end' : 'middle'} />
    {/each}
  {/if}
</g>
