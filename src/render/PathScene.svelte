<svelte:options namespace="svg" />
<script lang="ts">
  // A path scene: backdrop, links, nodes, labels, nerd tags, tap hints and packets. The root scene also draws the chosen
  // places' backdrops (the house, the street) and the swap badge on the start device.
  import { bezier, curvePath, WORLD_SIZE } from '../engine/geometry';
  import type { LivePacket } from '../engine/packets';
  import { nodeArt, placeBackdrops } from '../model/components';
  import { startNode, type PathScene, type SNode } from '../model/layout';
  import type { Route } from '../model/resolve';
  import { loc, nameOf, routeKeys, themeState, tr, trFirst, view } from '../state.svelte';
  import TagAt from './TagAt.svelte';
  import Text from './Text.svelte';

  let { route, ps, packets, focus, root, places }: {
    route: Route; ps: PathScene; packets: LivePacket[]; focus: string | null; root: boolean;
    /** Place backdrops to draw (root only); defaults to the route's places. */
    places?: { id: string; alpha: number; dx: number }[];
  } = $props();
  const W = $derived(WORLD_SIZE[view.orient]);
  const portrait = $derived(view.orient === 'portrait');
  const A = $derived(themeState.current.art);
  const nerd = $derived(loc.level === 'nerd');
  const backdrops = $derived(places ?? route.slots.map((s) => ({ id: s.place, alpha: 1, dx: 0 })));
  const labelY = (n: SNode) => (n.label === 'above' ? n.y - n.size / 2 - 4 : n.y + n.size / 2 + 30);
  const nodeTag = (n: SNode) => (nerd ? trFirst([...routeKeys(`tag.${n.id}`), `node.${n.node.id}.tag`]) : '');
  const flowColour = (flow: string, kind: string) =>
    route.activity.flows.find((f) => f.id === flow)?.packets.find((p) => p.kind === kind)?.colour ?? '#fff';
  const swapAt = $derived(root ? startNode(ps) : null);
</script>

<g class="scene scene-{ps.key}">
  <A.Backdrop kind={root ? 'root' : 'group'} orient={view.orient} w={W.w} h={W.h} time={view.time} />
  {#if root}
    {#each backdrops as b (b.id)}
      {@const B = placeBackdrops[b.id]}
      {#if B}<g opacity={b.alpha} transform={b.dx ? `translate(${b.dx} 0)` : undefined}><B orient={view.orient} w={W.w} h={W.h} time={view.time} /></g>{/if}
    {/each}
  {/if}
  {#each ps.links as l (l.id)}
    <g opacity={l.alpha < 1 ? l.alpha : undefined}>
      <A.Link look={l.link.tech.look} d={curvePath(l)} curve={l} colour={l.link.tech.colour} dashed={l.dashed} time={view.time} focused={focus === l.id} />
    </g>
  {/each}
  {#each ps.nodes as n (n.id)}
    {@const art = nodeArt[n.node.id]}
    <g opacity={n.alpha < 1 ? n.alpha : undefined}>
      <A.Device id={n.node.id} Art={art?.default ?? null} face={art?.face ?? null} x={n.x} y={n.y} size={n.size} time={view.time} context="path" focused={focus === n.id} />
    </g>
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
  {#each ps.links.filter((l) => l.dive && l.alpha > 0.5) as l (l.id)}
    {@const m = bezier(l, 0.5)}
    <A.Hint kind="dive" x={m.x} y={m.y} time={view.time} />
  {/each}
  {#each ps.nodes.filter((n) => n.kind === 'group' && n.alpha > 0.5) as n (n.id)}
    <A.Hint kind="expand" x={n.x + n.size * 0.36} y={n.y - n.size * 0.26} time={view.time} />
  {/each}
  {#if swapAt}
    <g class="swap-hint"><A.Hint kind="swap" x={swapAt.x + swapAt.size * 0.36} y={swapAt.y - swapAt.size * 0.36} time={view.time} /></g>
  {/if}
  {#each packets as p (p.id)}
    <A.Packet kind={p.kind} pose={p.pose} colour={p.colour ?? flowColour(p.flow, p.kind)} time={view.time} followed={view.followId === p.id} />
  {/each}
</g>
