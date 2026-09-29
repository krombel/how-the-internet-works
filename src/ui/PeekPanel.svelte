<script lang="ts">
  // Peek inside the followed packet: its nested envelopes for the link it is on right now. Each envelope is a reusable
  // layer component (content/layers/<id>) that decides what to show from its context (issue #5).
  import type { LivePacket } from '../engine/packets';
  import { layerViews } from '../model/components';
  import type { Route } from '../model/resolve';
  import { layerCtx, stackOf } from '../model/stack';
  import { fill, loc, nameOf, tr } from '../state.svelte';
  import Icon from './Icon.svelte';
  let { packet, route, onclose }: { packet: LivePacket; route: Route; onclose: () => void } = $props();
  const link = $derived(packet.pose.link.link);
  const ctx = $derived(layerCtx(route, link, packet.flow, packet.kind, packet.dir, loc.level));
  const flowStack = $derived(route.activity.flows.find((f) => f.id === packet.flow)?.stack ?? []);
  const stack = $derived(stackOf(route, link, flowStack, ctx.role));
  // re-mount (and re-animate the unwrap/rewrap) whenever the packet moves onto a new link
  const sig = $derived(`${link.id}:${packet.dir}`);
</script>

<aside class="peek card" data-ui aria-live="polite">
  <header>
    <h2>{tr(`activity.${route.activity.id}.peek.${packet.kind}`)}</h2>
    <button class="btn" onclick={onclose} aria-label={tr('peek.close')}><Icon name="close" /></button>
  </header>
  <p class="where">{fill(tr('peek.where'), { from: nameOf(ctx.from.node.id), to: nameOf(ctx.to.node.id) })}</p>
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
