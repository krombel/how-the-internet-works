<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Envelope, fakeMac, fill, nameOf, strings, yours, type LayerCtx } from '$core/api';
  let { ctx, open, depth, children }: { ctx: LayerCtx; open: boolean; depth: number; children?: Snippet } = $props();
  const L = strings('layer.wifi');
  const to = $derived(nameOf(ctx.to.node.id));
  const fields = $derived<[string, string][]>(ctx.level === 'nerd'
    ? [[L('to'), `${to} · ${fakeMac(ctx.to.id)}`], [L('band'), '5 GHz · ch 36 · 802.11ax']]
    : [[L('to'), to]]);
</script>

<Envelope id="wifi" name={L('name', ctx.level)} {open} {depth} {fields} note={fill(L('note', ctx.level), { yours: yours(ctx.client) })}>{@render children?.()}</Envelope>
