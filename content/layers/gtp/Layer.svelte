<script lang="ts">
  // GTP-U: the cell tower tunnels the phone's own IP packet to the mobile core inside an outer IP/UDP packet.
  import type { Snippet } from 'svelte';
  import { Envelope, strings, type LayerCtx } from '$core/api';
  let { ctx, open, depth, children }: { ctx: LayerCtx; open: boolean; depth: number; children?: Snippet } = $props();
  const L = strings('layer.gtp');
  const fields = $derived<[string, string][]>(ctx.level === 'nerd'
    ? [[L('from'), ctx.from.addr ?? ''], [L('to'), ctx.to.addr ?? ''], ['TEID', '0x1f3a92c4']]
    : []);
</script>

<Envelope id="gtp" name={L('name', ctx.level)} {open} {depth} {fields} note={L('note', ctx.level)}>{@render children?.()}</Envelope>
