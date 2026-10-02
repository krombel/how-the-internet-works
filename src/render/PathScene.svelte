<svelte:options namespace="svg" />
<script lang="ts">
  // A path scene: backdrop, owner regions, links, nodes, labels, nerd tags, doors and packets. The root scene also draws the chosen places' backdrops (the house, the street) and the swap door on the
  // start device; a group's scene draws the road the packets take through it. Doors (model/doors.ts) are drawn in two
  // parts: a glow around what they open, under the nodes, and a badge over them. Owner regions (model/regions.ts) too:
  // their areas under the road, their signs over the devices.
  import { curvePath, WORLD_SIZE } from '../engine/geometry';
  import { perPx, pts } from '../engine/svg';
  import type { LivePacket } from '../engine/packets';
  import { groupBackdrops, nodeArt, placeBackdrops } from '../model/components';
  import { badgeBox, badgeSize, doorsOf, layoutDoors, type Door } from '../model/doors';
  import { placeTexts, type Per } from '../model/labels';
  import type { PathScene, SNode } from '../model/layout';
  import { regionsOf } from '../model/regions';
  import { chainOf, diveRuns } from '../model/tree';
  import type { Route } from '../model/resolve';
  import { loc, nameOf, nameW, routeKeys, themeState, tr, trFirst, trl, view } from '../state.svelte';
  import { getScene, getWorld, legibleSize, tagSize } from './ctx';
  import TagAt from './TagAt.svelte';
  import Text from './Text.svelte';

  let { route, ps, packets, focus, root, places, hot = null, lit = false, kbd = false }: {
    route: Route; ps: PathScene; packets: LivePacket[]; focus: string | null; root: boolean;
    /** Place backdrops to draw (root only); defaults to the route's places. */
    places?: { id: string; alpha: number; dx: number }[];
    /** The door pointed at (its item id), and whether "What can I explore?" lights every door up. */
    hot?: string | null; lit?: boolean;
    /** The focused stop has keyboard focus: ring it. */
    kbd?: boolean;
  } = $props();
  const world = getWorld(), scene = getScene();
  const W = $derived(WORLD_SIZE[view.orient]);
  const portrait = $derived(view.orient === 'portrait');
  const A = $derived(themeState.current.art);
  const nerd = $derived(loc.level === 'nerd');
  const backdrops = $derived(places ?? route.slots.map((s) => ({ id: s.place, alpha: 1, dx: 0 })));
  const nodeTag = (n: SNode) => (nerd ? trFirst([...routeKeys(`tag.${n.id}`), `node.${n.node.id}.tag`]) : '');
  const flowColour = (flow: string, kind: string) =>
    route.activity.flows.find((f) => f.id === flow)?.packets.find((p) => p.kind === kind)?.colour ?? '#fff';
  const GroupBackdrop = $derived(ps.group ? groupBackdrops[route.hops[ps.group].node.id] : undefined);
  const regions = $derived(regionsOf(route, ps));
  // only the networks on the packets' way are named: a side branch is just faintly there
  const named = $derived(regions.filter((g) => !g.aside));
  const road = $derived(root ? '' : `M${pts(chainOf(route, ps.group, view.orient).pts)}`);
  // the road is the route's final shape: during a place morph it fades in with the route's newcomers
  const roadAlpha = $derived(Math.min(1, ...ps.links.filter((l) => ps.route.includes(l.id)).map((l) => l.alpha)));
  const signPx = $derived(Math.max(24, themeState.current.labelMinPx / (world.cam.k * scene.frame.s)));
  // text keeps inside the world at the size it is drawn (model/labels.ts)
  const legible = legibleSize(), tagPx = tagSize();
  const sizes = $derived({ name: legible(28), link: legible(24), tag: tagPx(20), sign: signPx });
  const per: Per = (text, font) => {
    void themeState.current.id;
    return perPx(text, font === 'tag' ? '--tag-font' : '--label-font');
  };
  const doors = $derived(doorsOf(ps, root, diveRuns(route, ps.group, view.orient).byLink, view.orient, nameW));
  const doorPx = $derived(badgeSize(themeState.current.labelMinPx, world.cam.k * scene.frame.s));
  const doorTime = $derived(view.still ? 0 : view.time);
  const doorLabel = (d: Door) => tr(`door.${d.kind}`);
  const labelW = (d: Door) => per(doorLabel(d), 'label') * doorPx;
  const linkTag = (l: PathScene['links'][number]) => (nerd ? trFirst([...routeKeys(`tag.${l.id}`), `tech.${l.link.tech.id}.tag`]) : '');
  const texts = $derived.by(() => {
    const badges = doors.map((d) => badgeBox(d.at, doorPx));
    return placeTexts({
      nodes: ps.nodes.map((n) => ({ n, name: nameOf(n.node.id), tag: nodeTag(n) })),
      links: root ? ps.links.map((l) => ({ l, name: tr(`tech.${l.link.tech.id}.name`), tag: linkTag(l), badge: badges[doors.findIndex((d) => d.links.includes(l.id))] })) : [],
      signs: named.map((g) => ({ at: g.sign, name: trl(`owner.${g.owner}.name`) })),
      badges,
    }, sizes, per, W, portrait);
  });
  const boxes = $derived(layoutDoors(doors, doorPx, lit, hot, labelW));
  const doorTarget = (d: Door) => {
    if (d.links.length) return { d: d.links.map((id) => curvePath(ps.links.find((k) => k.id === id)!)).join(' ') };
    const n = ps.nodes.find((k) => k.id === d.id)!;
    return { x: n.x, y: n.y, size: n.size };
  };
</script>

{#snippet door(d: Door, i: number, part: 'glow' | 'badge')}
  <A.Hint kind={d.kind} {part} x={d.at.x} y={boxes[i].y} label={doorLabel(d)} labelW={labelW(d)} labelled={boxes[i].labelled}
    size={doorPx} hot={lit || hot === d.id} target={doorTarget(d)} time={doorTime} />
{/snippet}

<g class="scene scene-{ps.key}">
  <A.Backdrop kind={root ? 'root' : 'group'} orient={view.orient} w={W.w} h={W.h} time={view.time} />
  {#if GroupBackdrop}<GroupBackdrop orient={view.orient} w={W.w} h={W.h} time={view.time} />{/if}
  {#if root}
    {#each backdrops as b (b.id)}
      {@const B = placeBackdrops[b.id]}
      {#if B}<g opacity={b.alpha} transform={b.dx ? `translate(${b.dx} 0)` : undefined}><B orient={view.orient} w={W.w} h={W.h} time={view.time} /></g>{/if}
    {/each}
  {/if}
  {#each regions as g (g.owner)}
    <A.Region part="area" d={g.d} tone={g.tone} aside={g.aside} x={g.sign.x} y={g.sign.y} label="" size={signPx} />
  {/each}
  {#if road && roadAlpha > 0}
    <g opacity={roadAlpha < 1 ? roadAlpha : undefined}><A.Road d={road} orient={view.orient} time={view.time} /></g>
  {/if}
  {#each ps.links as l (l.id)}
    <g opacity={l.alpha < 1 ? l.alpha : undefined}>
      <A.Link look={l.link.tech.look} d={curvePath(l)} curve={l} colour={l.link.tech.colour} dashed={l.dashed} time={view.time} focused={focus === l.id} kbd={kbd && focus === l.id} />
    </g>
  {/each}
  {#each doors as d, i (d.id)}{@render door(d, i, 'glow')}{/each}
  {#each ps.nodes as n (n.id)}
    {@const art = nodeArt[n.node.id]}
    <g opacity={n.alpha < 1 ? n.alpha : undefined}>
      <A.Device id={n.node.id} Art={art?.default ?? null} face={art?.face ?? null} x={n.x} y={n.y} size={n.size} time={view.time} context="path" focused={focus === n.id} kbd={kbd && focus === n.id} />
    </g>
  {/each}
  <!-- beneath the node names and tags: when it gets crowded (nerd tags), the boxes stay readable -->
  {#each named as g, i (g.owner)}
    <A.Region part="sign" d={g.d} tone={g.tone} aside={g.aside} x={texts.signs[i].x} y={texts.signs[i].y} label={trl(`owner.${g.owner}.name`)} size={signPx} />
  {/each}
  {#each ps.nodes as n, i (n.id)}
    {@const at = texts.nodes[i]}
    <g opacity={n.alpha < 1 ? n.alpha : undefined}>
      <Text x={at.name.x} y={at.name.y} text={nameOf(n.node.id)} size={28} kind="node" />
      {#if at.tag}<TagAt x={at.tag.x} y={at.tag.y} text={at.tag.text} anchor={at.tag.anchor} />{/if}
    </g>
  {/each}
  {#if root}
    {#each ps.links as l, i (l.id)}
      {@const at = texts.links[i]}
      <g opacity={l.alpha < 1 ? l.alpha : undefined}>
        <Text x={at.name.x} y={at.name.y} text={tr(`tech.${l.link.tech.id}.name`)} size={24} kind="link" colour={l.link.tech.colour} anchor={at.name.anchor} />
        {#if at.tag}<TagAt x={at.tag.x} y={at.tag.y} text={at.tag.text} anchor={at.tag.anchor} />{/if}
      </g>
    {/each}
  {/if}
  {#each packets as p (p.id)}
    <A.Packet kind={p.kind} dir={p.dir} pose={p.pose} colour={p.colour ?? flowColour(p.flow, p.kind)} time={view.time} followed={view.followId === p.id} />
  {/each}
  {#each doors as d, i (d.id)}{@render door(d, i, 'badge')}{/each}
</g>
