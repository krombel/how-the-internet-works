<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Envelope, strings, type LayerCtx } from '$core/api';
  let { ctx, open, depth, children }: { ctx: LayerCtx; open: boolean; depth: number; children?: Snippet } = $props();
  const L = strings('layer.tls');
  const fields = $derived<[string, string][]>(ctx.level === 'nerd' ? [['', 'TLS 1.3 · AES-128-GCM']] : []);
</script>

<Envelope id="tls" name={L('name', ctx.level)} {open} {depth} {fields} note={L('note', ctx.level)} sealed={L('sealed', ctx.level)}>{@render children?.()}</Envelope>
