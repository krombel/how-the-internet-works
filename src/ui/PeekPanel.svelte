<script lang="ts">
  // Peek inside the followed packet: its nested envelopes for the link it is on right now. Each envelope is a reusable
  // layer component (content/layers/<id>) that decides what to show from its context (issue #5). A layer with a dive
  // gets a magnifier: tap it to fly into that layer at the hop reading the packet (issue #8).
  import type { LivePacket } from '../engine/packets';
  import { layerViews } from '../model/components';
  import type { Route } from '../model/resolve';
  import { layerCtx, stackOf } from '../model/stack';
  import { layerPath } from '../model/tree';
  import { setPeekDives } from '../render/ctx';
  import { loadDive } from '../render/dives.svelte';
  import { fill, loc, nameOf, tr } from '../state.svelte';
  import Icon from './Icon.svelte';
  let { packet, route, onclose, ondive }: {
    packet: LivePacket; route: Route; onclose: () => void; ondive: (path: string[], env: HTMLElement) => void;
  } = $props();
  const link = $derived(packet.pose.link.link);
  const ctx = $derived(layerCtx(route, link, packet.flow, packet.kind, packet.dir, loc.level));
  const flowStack = $derived(route.activity.flows.find((f) => f.id === packet.flow)?.stack ?? []);
  const stack = $derived(stackOf(route, link, flowStack, ctx.role));
  // re-mount (and re-animate the unwrap/rewrap) whenever the packet moves onto a new link
  const sig = $derived(`${link.id}:${packet.dir}`);
  const dives = $derived(new Map(stack.flatMap((e) => {
    const p = layerPath(route, ctx.to.id, e.id);
    return p ? [[e.id, p] as const] : [];
  })));
  $effect(() => { for (const id of dives.keys()) void loadDive(route.content.layers[id].dive!); });
  setPeekDives({ can: (id) => dives.has(id), open: (id, env) => ondive(dives.get(id)!, env) });
</script>

<aside class="peek card" data-ui aria-live="polite">
  <header>
    <h2>{tr(`activity.${route.activity.id}.peek.${packet.kind}`)}</h2>
    <button class="btn" onclick={onclose} aria-label={tr('peek.close')}><Icon name="close" /></button>
  </header>
  <p class="where">{fill(tr('peek.where'), { from: nameOf(ctx.from.node.id), to: nameOf(ctx.to.node.id) })}</p>
  {#if dives.size}<p class="where dive-hint">{tr('peek.dive')}</p>{/if}
  {#key sig}
    {@render nest(0)}
  {/key}
</aside>

{#snippet nest(i: number)}
  {@const L = layerViews[stack[i]?.id]}
  {#if L}
    <L {ctx} open={stack[i].open} depth={i}>{#if i + 1 < stack.length}{@render nest(i + 1)}{/if}</L>
  {:else if i + 1 < stack.length}{@render nest(i + 1)}{/if}
{/snippet}
