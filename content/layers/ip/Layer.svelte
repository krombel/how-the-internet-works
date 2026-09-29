<script lang="ts">
  // IP is what every router reads. A bridge passes it on untouched; a NAT rewrites the client's address.
  import type { Snippet } from 'svelte';
  import { Envelope, fill, nameOf, strings, yours, type LayerCtx } from '$core/api';
  let { ctx, open, depth, children }: { ctx: LayerCtx; open: boolean; depth: number; children?: Snippet } = $props();
  const L = strings('layer.ip');
  const up = $derived(ctx.dir === 'up');
  const fields = $derived<[string, string][]>(ctx.level === 'nerd'
    ? [[L('from'), ctx.src], [L('to'), ctx.dst], ['TTL', String(ctx.ttl)]]
    : [[L('from'), up ? yours(ctx.client) : L('server')], [L('to'), up ? L('server') : yours(ctx.client)]]);
  const note = $derived.by(() => {
    const vars = { name: nameOf(ctx.to.node.id), yours: yours(ctx.client), inside: ctx.nat?.inside ?? '', outside: ctx.nat?.outside ?? '' };
    const k = ctx.nat ? (up ? 'nat' : 'unnat') : ctx.role === 'bridge' ? 'bridge' : ctx.role === 'endpoint' ? 'arrived' : 'read';
    return fill(L(k, ctx.level), vars);
  });
</script>

<Envelope id="ip" name={L('name', ctx.level)} {open} {depth} {fields} {note}>{@render children?.()}</Envelope>
