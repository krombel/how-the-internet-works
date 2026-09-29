<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Envelope, strings, type LayerCtx } from '$core/api';
  let { ctx, open, depth, children }: { ctx: LayerCtx; open: boolean; depth: number; children?: Snippet } = $props();
  const L = strings('layer.gpon');
  const down = $derived(ctx.dir === 'down');
  const fields = $derived<[string, string][]>(ctx.level === 'nerd'
    ? [['GEM port', '1127'], [L('colour'), down ? '1577 nm ↓' : '1270 nm ↑']]
    : [[L('colour'), L(down ? 'down' : 'up')]]);
</script>

<Envelope id="gpon" name={L('name', ctx.level)} {open} {depth} {fields} note={L('note', ctx.level)}>{@render children?.()}</Envelope>
