<svelte:options namespace="svg" />
<script lang="ts">
  // The whole scene tree through the camera. Every mounted scene gets its own flat matrix (camera × frame), so deep
  // nesting (k ≈ 1000×) never multiplies transforms inside the SVG renderer.
  import type { Cam } from '../engine/camera';
  import type { LivePacket } from '../engine/packets';
  import type { PathScene } from '../model/layout';
  import type { Route } from '../model/resolve';
  import { setWorld, type Mounted } from './ctx';
  import SceneView from './SceneView.svelte';

  let { cam, route, mounted, packets, scenes, places, focus }: {
    cam: Cam; route: Route; mounted: Mounted[];
    packets: Map<string, LivePacket[]>;
    /** Path scenes to draw instead of the route's own (while morphing between places). */
    scenes: Map<string, PathScene>;
    /** Place backdrops while morphing (see PathScene). */
    places?: { id: string; alpha: number; dx: number }[];
    /** The current scene, its focused stop, the door pointed at and whether "What can I explore?" is on. */
    focus: { key: string; stop: string | null; hot: string | null; lit: boolean };
  } = $props();
  setWorld({ get cam() { return cam; } });
</script>

<g class="world">
  {#each mounted as m (m.key)}
    <SceneView {route} path={m.path} alpha={m.alpha} slide={m.slide} packets={packets.get(m.key) ?? []} scene={scenes.get(m.key)} {places}
      focus={focus.key === m.key ? focus.stop : null} hot={focus.key === m.key ? focus.hot : null} lit={focus.key === m.key && focus.lit} />
  {/each}
</g>
