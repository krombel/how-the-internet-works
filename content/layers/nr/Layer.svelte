<script lang="ts">
  // The 5G radio frame between a phone and the cell tower.
  import type { Snippet } from 'svelte';
  import { Envelope, nameOf, strings, type LayerCtx } from '$core/api';
  let { ctx, open, depth, children }: { ctx: LayerCtx; open: boolean; depth: number; children?: Snippet } = $props();
  const L = strings('layer.nr');
  const to = $derived(nameOf(ctx.to.node.id));
  const fields = $derived<[string, string][]>(ctx.level === 'nerd'
    ? [[L('to'), `${to} · C-RNTI 0x4601`], [L('slot'), '0.5 ms · 30 kHz · n78 3.5 GHz']]
    : [[L('to'), to]]);
</script>

<Envelope id="nr" name={L('name', ctx.level)} {open} {depth} {fields} note={L('note', ctx.level)}>{@render children?.()}</Envelope>
