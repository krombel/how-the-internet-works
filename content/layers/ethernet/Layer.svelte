<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Envelope, fakeMac, nameOf, strings, type LayerCtx } from '$core/api';
  let { ctx, open, depth, children }: { ctx: LayerCtx; open: boolean; depth: number; children?: Snippet } = $props();
  const L = strings('layer.ethernet');
  const to = $derived(nameOf(ctx.to.node.id));
  const fields = $derived<[string, string][]>(ctx.level === 'nerd'
    ? [[L('to'), `${to} · ${fakeMac(ctx.to.id)}`], ['EtherType', ctx.link.stack.includes('vlan') ? '0x88A8 (802.1ad)' : '0x0800 (IPv4)']]
    : [[L('to'), to]]);
</script>

<Envelope id="ethernet" name={L('name', ctx.level)} {open} {depth} {fields} note={L('note', ctx.level)}>{@render children?.()}</Envelope>
