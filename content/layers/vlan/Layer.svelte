<script lang="ts">
  // Q-in-Q tags on the operator's backhaul: which street cabinet, which customer.
  import type { Snippet } from 'svelte';
  import { Envelope, strings, type LayerCtx } from '$core/api';
  let { ctx, open, depth, children }: { ctx: LayerCtx; open: boolean; depth: number; children?: Snippet } = $props();
  const L = strings('layer.vlan');
  const fields = $derived<[string, string][]>(ctx.level === 'nerd' ? [['S-VLAN', '101'], ['C-VLAN', '2042']] : []);
</script>

<Envelope id="vlan" name={L('name', ctx.level)} {open} {depth} {fields} note={L('note', ctx.level)}>{@render children?.()}</Envelope>
