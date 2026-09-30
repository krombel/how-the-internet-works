<svelte:options namespace="svg" />
<script lang="ts">
  // A path scene: backdrop, owner regions, links, nodes, labels, nerd tags, doors and packets. The root scene also draws the chosen places' backdrops (the house, the street) and the swap door on the
  // start device; a group's scene draws the road the packets take through it. Doors (model/doors.ts) are drawn in two
  // parts: a glow around what they open, under the nodes, and a badge over them. Owner regions (model/regions.ts) too:
  // their areas under the road, their signs over the devices.
  import { bezier, curvePath, WORLD_SIZE } from '../engine/geometry';
  import { pts, textBox } from '../engine/svg';
  import type { LivePacket } from '../engine/packets';
  import { nodeArt, placeBackdrops } from '../model/components';
  import { badgeSize, doorsOf, layoutDoors, type Door } from '../model/doors';
  import { labelY, type PathScene, type SNode } from '../model/layout';
  import { regionsOf } from '../model/regions';
  import { chainOf, diveRuns } from '../model/tree';
  import type { Route } from '../model/resolve';
  import { loc, nameOf, nameW, routeKeys, themeState, tr, trFirst, trl, view } from '../state.svelte';
  import { getScene, getWorld } from './ctx';
  import TagAt from './TagAt.svelte';
  import Text from './Text.svelte';

  let { route, ps, packets, focus, root, places, hot = null, lit = false }: {
    route: Route; ps: PathScene; packets: LivePacket[]; focus: string | null; root: boolean;
    /** Place backdrops to draw (root only); defaults to the route's places. */
    places?: { id: string; alpha: number; dx: number }[];
    /** The door pointed at (its item id), and whether "What can I explore?" lights every door up. */
    hot?: string | null; lit?: boolean;
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
  const regions = $derived(regionsOf(route, ps));
  // only the networks on the packets' way are named: a side branch is just faintly there
  const named = $derived(regions.filter((g) => !g.aside));
  const road = $derived(root ? '' : `M${pts(chainOf(route, ps.group, view.orient).pts)}`);
  const signPx = $derived(Math.max(24, themeState.current.labelMinPx / (world.cam.k * scene.frame.s)));
  const doors = $derived(doorsOf(ps, root, diveRuns(route, ps.group, view.orient).byLink, view.orient, nameW));
  const doorPx = $derived(badgeSize(themeState.current.labelMinPx, world.cam.k * scene.frame.s));
  const doorTime = $derived(view.still ? 0 : view.time);
  const doorLabel = (d: Door) => tr(`door.${d.kind}`);
  /** Label widths per 1 px of font, measured once per language and theme (not at every zoom step). */
  const perPx = $derived.by(() => {
    void themeState.current.id;
    return Object.fromEntries((['dive', 'expand', 'swap'] as const).map((k) => [k, textBox(tr(`door.${k}`), 100, 'middle', 0.6, '--label-font').w / 100]));
  });
  const labelW = (d: Door) => perPx[d.kind] * doorPx;
  const boxes = $derived(layoutDoors(doors, doorPx, lit, hot, labelW));
  const doorTarget = (d: Door) => {
    if (d.kind === 'dive') return { d: d.links.map((id) => curvePath(ps.links.find((k) => k.id === id)!)).join(' ') };
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
  {#if root}
    {#each backdrops as b (b.id)}
      {@const B = placeBackdrops[b.id]}
      {#if B}<g opacity={b.alpha} transform={b.dx ? `translate(${b.dx} 0)` : undefined}><B orient={view.orient} w={W.w} h={W.h} time={view.time} /></g>{/if}
    {/each}
  {/if}
  {#each regions as g (g.owner)}
    <A.Region part="area" d={g.d} tone={g.tone} aside={g.aside} x={g.sign.x} y={g.sign.y} label="" size={signPx} />
  {/each}
  {#if road}<A.Road d={road} orient={view.orient} time={view.time} />{/if}
  {#each ps.links as l (l.id)}
    <g opacity={l.alpha < 1 ? l.alpha : undefined}>
      <A.Link look={l.link.tech.look} d={curvePath(l)} curve={l} colour={l.link.tech.colour} dashed={l.dashed} time={view.time} focused={focus === l.id} />
    </g>
  {/each}
  {#each doors as d, i (d.id)}{@render door(d, i, 'glow')}{/each}
  {#each ps.nodes as n (n.id)}
    {@const art = nodeArt[n.node.id]}
    <g opacity={n.alpha < 1 ? n.alpha : undefined}>
      <A.Device id={n.node.id} Art={art?.default ?? null} face={art?.face ?? null} x={n.x} y={n.y} size={n.size} time={view.time} context="path" focused={focus === n.id} />
    </g>
  {/each}
  <!-- beneath the node names and tags: when it gets crowded (nerd tags), the boxes stay readable -->
  {#each named as g (g.owner)}
    <A.Region part="sign" d={g.d} tone={g.tone} aside={g.aside} x={g.sign.x} y={g.sign.y} label={trl(`owner.${g.owner}.name`)} size={signPx} />
  {/each}
  {#each ps.nodes as n (n.id)}
    {@const tag = nodeTag(n)}
    <g opacity={n.alpha < 1 ? n.alpha : undefined}>
      <Text x={n.x} y={labelY(n)} text={nameOf(n.node.id)} size={28} kind="node" />
      {#if tag && portrait}
        <!-- portrait: beside the node, towards the middle of the screen, where there is room for a long callout -->
        {@const right = n.x < W.w / 2}
        <TagAt x={n.x + (right ? 1 : -1) * (n.size / 2 + 14)} y={n.y + 8} text={tag} anchor={right ? 'start' : 'end'} />
      {:else if tag}
        <!-- landscape: stacked just beyond the name label; hugging the edge near the sides of the world -->
        {@const edge = n.x > W.w - 260 ? 'end' : n.x < 260 ? 'start' : 'middle'}
        <TagAt x={edge === 'end' ? n.x + n.size / 2 : edge === 'start' ? n.x - n.size / 2 : n.x}
          y={n.label === 'above' ? labelY(n) - 44 : labelY(n) + 36} text={tag} anchor={edge} />
      {/if}
    </g>
  {/each}
  {#if root}
    {#each ps.links as l (l.id)}
      {@const m = bezier(l, 0.5)}
      {@const lo = l.label}
      {@const tag = nerd ? trFirst([...routeKeys(`tag.${l.id}`), `tech.${l.link.tech.id}.tag`]) : ''}
      <g opacity={l.alpha < 1 ? l.alpha : undefined}>
        <Text x={m.x + lo[0]} y={m.y + lo[1]} text={tr(`tech.${l.link.tech.id}.name`)} size={24} kind="link" colour={l.link.tech.colour} />
        {#if tag && portrait}
          <TagAt x={m.x + (lo[0] < 0 ? 26 : -26)} y={m.y + 8} text={tag} anchor={lo[0] < 0 ? 'start' : 'end'} />
        {:else if tag}<TagAt x={m.x + lo[0]} y={m.y + lo[1] + (lo[1] < 0 ? -40 : 34)} text={tag} />{/if}
      </g>
    {/each}
  {/if}
  {#each packets as p (p.id)}
    <A.Packet kind={p.kind} pose={p.pose} colour={p.colour ?? flowColour(p.flow, p.kind)} time={view.time} followed={view.followId === p.id} />
  {/each}
  {#each doors as d, i (d.id)}{@render door(d, i, 'badge')}{/each}
</g>
