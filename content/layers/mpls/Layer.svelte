<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Envelope, strings, type LayerCtx } from '$core/api';
  let { ctx, open, depth, children }: { ctx: LayerCtx; open: boolean; depth: number; children?: Snippet } = $props();
  const L = strings('layer.mpls');
  const fields = $derived<[string, string][]>(ctx.level === 'nerd' ? [[L('label'), `24012 · TC 0 · TTL ${ctx.ttl}`]] : []);
</script>

<Envelope id="mpls" name={L('name', ctx.level)} {open} {depth} {fields} note={L('note', ctx.level)}>{@render children?.()}</Envelope>
