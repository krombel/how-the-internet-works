<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Envelope, strings, type LayerCtx } from '$core/api';
  let { ctx, open, depth }: { ctx: LayerCtx; open: boolean; depth: number; children?: Snippet } = $props();
  const L = strings('layer.http');
  const up = $derived(ctx.dir === 'up');
  const fields = $derived<[string, string][]>(ctx.level === 'nerd'
    ? up ? [['', 'GET /v/cats/seg-042.m4s'], ['Host', 'video.example']] : [['', '200 OK'], ['Content-Type', 'video/mp4']]
    : []);
</script>

<Envelope id="http" name={L('name', ctx.level)} {open} {depth} {fields} note={L(up ? 'request' : 'video', ctx.level)} />
