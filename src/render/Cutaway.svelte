<svelte:options namespace="svg" />
<script lang="ts">
  // A group node's cutaway: the path inside it (roads, stops and the packets on their way), as faint silhouettes at the
  // exact spot where its own path scene opens when you zoom in, so opening it grows what was already there. Drawn in
  // the node's 200×200 box (the theme's Device slot places, clips and fades it).
  import { DETAIL_SCALE, WORLD_SIZE, curvePath } from '../engine/geometry';
  import { livePackets, specsFor } from '../engine/packets';
  import { nodeArt } from '../model/components';
  import { pathScene, type SNode } from '../model/layout';
  import type { Route } from '../model/resolve';
  import { nodeAnchor } from '../model/tree';
  import { view } from '../state.svelte';

  let { route, node }: { route: Route; node: SNode } = $props();
  const ps = $derived(pathScene(route, node.id, view.orient));
  const box = $derived.by(() => {
    const W = WORLD_SIZE[view.orient], a = nodeAnchor(node), s = 200 / node.size;
    const x = a.x - (W.w * DETAIL_SCALE) / 2 - (node.x - node.size / 2), y = a.y - (W.h * DETAIL_SCALE) / 2 - (node.y - node.size / 2);
    return `scale(${s}) translate(${x} ${y}) scale(${DETAIL_SCALE})`;
  });
  const colour = (flow: string, kind: string) =>
    route.activity.flows.find((f) => f.id === flow)?.packets.find((p) => p.kind === kind)?.colour ?? 'currentColor';
  const packets = $derived(livePackets(specsFor(ps, route.activity.flows), ps.links, view.time, `cut:${node.id}`));
</script>

<g class="cutaway" transform={box}>
  {#each ps.links as l (l.id)}<path class="cut-road" class:dashed={l.dashed} d={curvePath(l)} />{/each}
  {#each ps.nodes as n (n.id)}
    {@const Art = nodeArt[n.node.id]?.default}
    <g class="cut-stop" transform="translate({n.x - n.size / 2} {n.y - n.size / 2}) scale({n.size / 200})">
      {#if Art}<Art time={0} />{:else}<rect x="34" y="44" width="132" height="112" rx="26" />{/if}
    </g>
  {/each}
  {#each packets as p (p.id)}<circle class="cut-packet" cx={p.pose.x} cy={p.pose.y} r="34" fill={p.colour ?? colour(p.flow, p.kind)} />{/each}
</g>

<style>
  .cutaway { color: var(--cut-ink, currentColor); }
  .cut-road { fill: none; stroke: currentColor; stroke-width: 50; stroke-linecap: round; }
  .cut-road.dashed { stroke-dasharray: 60 50; }
  .cut-stop :global(*) { fill: currentColor !important; stroke: currentColor !important; }
  .cut-stop :global(:is(.line, .wave, .roof, .smile)) { fill: none !important; }
</style>
