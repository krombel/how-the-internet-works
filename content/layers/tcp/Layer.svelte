<script lang="ts">
  // TCP stays sealed on the way: only the endpoints open it. A NAT peeks at the port numbers.
  import type { Snippet } from 'svelte';
  import { Envelope, fill, strings, yours, type LayerCtx } from '$core/api';
  let { ctx, open, depth, children }: { ctx: LayerCtx; open: boolean; depth: number; children?: Snippet } = $props();
  const L = strings('layer.tcp');
  const up = $derived(ctx.dir === 'up');
  const nat = $derived(!!ctx.nat);
  const fields = $derived<[string, string][]>(ctx.level === 'nerd'
    ? open || nat
      ? [[L('ports'), up ? '51034 → 443' : '443 → 51034'], ...(open ? [[L('seq'), up ? '1 · ACK 88 321' : '88 321 · len 1 380'] as [string, string]] : [])]
      : []
    : open ? [[L('piece'), up ? '1' : '42']] : []);
  const note = $derived(!open && nat && ctx.level === 'nerd' ? L('peek', ctx.level) : '');
</script>

<Envelope id="tcp" name={L('name', ctx.level)} {open} {depth} {fields} {note} sealed={fill(L('sealed', ctx.level), { yours: yours(ctx.client) })}>{@render children?.()}</Envelope>
