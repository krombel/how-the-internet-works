<script lang="ts">
  // The shared look of one envelope layer in the peek panel. Styled entirely with theme tokens (--env-*). When the
  // layer has a dive, its head is a button that flies into it.
  import type { Snippet } from 'svelte';
  import { getPeekDives } from '../render/ctx';
  import { fill, tr } from '../state.svelte';
  let { id, name, open, depth, fields = [], note = '', sealed = '', children }: {
    id: string; name: string; open: boolean; depth: number; fields?: [string, string][]; note?: string; sealed?: string; children?: Snippet;
  } = $props();
  const dives = getPeekDives();
  let el: HTMLDivElement;
</script>

<div class="env env-{id}" class:sealed={!open} style:--d={depth} bind:this={el}>
  {#if dives?.can(id)}
    <button class="env-head env-go" onclick={() => dives.open(id, el)} aria-label={fill(tr('peek.look'), { name })}>{@render head()}
      <svg class="env-dive" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" /><circle cx="10.5" cy="10.5" r="4.2" /><path d="M13.6 13.6 L17.5 17.5" /></svg>
    </button>
  {:else}
    <div class="env-head">{@render head()}</div>
  {/if}
  {#if fields.length}
    <dl class="env-fields">{#each fields as [k, v]}<div>{#if k}<dt>{k}</dt>{/if}<dd dir="auto">{v}</dd></div>{/each}</dl>
  {/if}
  {#if note}<p class="env-note" dir="auto">{note}</p>{/if}
  {#if open && children}
    <div class="env-inner">{@render children()}</div>
  {:else if !open && sealed}
    <p class="env-sealed" dir="auto">{sealed}</p>
  {/if}
</div>

{#snippet head()}
  <span class="env-name">{name}</span>
  {#if !open}
    <svg class="env-lock" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" /><path d="M5 7 V5 a3 3 0 0 1 6 0 V7" fill="none" /></svg>
  {/if}
{/snippet}
