<svelte:options namespace="svg" />
<script lang="ts">
  // One scene of the tree at its frame: a path scene (nodes, links, packets) or a dive (content/scenes/<id>/Scene.svelte)
  // into a link, a device or a layer at one hop. Nested scenes sit on the theme's Panel, clipped to their world.
  import { WORLD_SIZE } from '../engine/geometry';
  import type { LivePacket } from '../engine/packets';
  import { fit } from '../engine/camera';
  import { sceneInfo } from '../engine/zoom';
  import { pathScene, type PathScene as PS } from '../model/layout';
  import type { Route } from '../model/resolve';
  import { layerCtx, opens } from '../model/stack';
  import { loc, themeState, view } from '../state.svelte';
  import { getWorld, setScene, type Subject } from './ctx';
  import { diveView } from './dives.svelte';
  import PathScene from './PathScene.svelte';

  let { route, path, alpha, packets, scene, places, focus, hot, lit }: {
    route: Route; path: string[]; alpha: number; packets: LivePacket[]; scene?: PS; focus: string | null; hot: string | null; lit: boolean;
    places?: { id: string; alpha: number; dx: number }[];
  } = $props();
  const world = getWorld();
  const info = $derived(sceneInfo(route, path, view.orient));
  const fitK = $derived(fit(info.fit, view.vp).k);
  setScene({ get path() { return path; }, get frame() { return info.frame; }, get fitK() { return fitK; } });
  const W = $derived(WORLD_SIZE[view.orient]);
  const A = $derived(themeState.current.art);
  const m = $derived.by(() => {
    const c = world.cam, f = info.frame, k = c.k * f.s;
    return `matrix(${k} 0 0 ${k} ${c.x + f.x * c.k} ${c.y + f.y * c.k})`;
  });
  const ref = $derived(info.ref);
  const ps = $derived(ref.kind === 'path' ? (scene ?? pathScene(route, ref.group, view.orient)) : null);
  const Dive = $derived(ref.dive ? diveView(ref.dive) : null);
  const subject = $derived.by((): Subject | null => {
    if (ref.link) return { kind: 'link', link: ref.link.link, sceneLink: ref.link, route };
    if (ref.node) {
      const hop = ref.node.hop;
      return { kind: 'node', hop, sceneNode: ref.node, in: route.links[hop.index - 1] ?? null, out: route.links[hop.index] ?? null, route };
    }
    const at = ref.at;
    if (!at) return null;
    const ctx = layerCtx(route, at.link, at.flow, at.kind, at.dir, loc.level);
    return { kind: 'layer', layer: at.layer, ctx, open: opens(route, at.layer, ctx.role), route };
  });
  const sealed = $derived(subject?.kind === 'layer' && !subject.open);
  const clip = $derived(`clip-${path.join('-') || 'root'}`);
  const visible = $derived(alpha > 0.002);
</script>

<g class="scene" transform={m} opacity={alpha} display={visible ? 'inline' : 'none'}>
  {#if path.length === 0}
    {#if ps}<PathScene {route} {ps} {packets} {focus} {places} {hot} {lit} root />{/if}
  {:else}
    <clipPath id={clip}><rect width={W.w} height={W.h} rx="60" /></clipPath>
    <g clip-path="url(#{clip})">
      <A.Panel part="back" kind={ref.kind} {sealed} w={W.w} h={W.h} orient={view.orient} time={view.time} />
      {#if ps}<PathScene {route} {ps} {packets} {focus} {hot} {lit} root={false} />
      {:else if Dive && subject}<Dive {subject} />{/if}
    </g>
    <A.Panel part="edge" kind={ref.kind} {sealed} w={W.w} h={W.h} orient={view.orient} time={view.time} />
  {/if}
</g>
