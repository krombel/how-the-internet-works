<script lang="ts">
  // The chrome's ⋯ menu: the entries of menu.ts as a WAI-ARIA menu. Focus moves into it when it opens; the arrow
  // keys, Home and End move between its items; Esc closes it and gives focus back to ⋯, Tab closes it and moves on.
  import { onMount } from 'svelte';
  import { menuMove, type MenuEntry } from './menu';
  import Icon from './Icon.svelte';

  let { entries, label, onclose }: {
    entries: MenuEntry[]; label: string;
    /** Close it; `back`: give focus back to the button that opened it. */
    onclose: (back: boolean) => void;
  } = $props();
  let el: HTMLDivElement;
  const items = () => [...el.querySelectorAll<HTMLElement>('[role^="menuitem"]')];
  onMount(() => items()[0]?.focus());
  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return onclose(true); }
    if (e.key === 'Tab') return onclose(false);
    const all = items(), i = all.indexOf(document.activeElement as HTMLElement);
    const to = menuMove(e.key, i, all.length, getComputedStyle(el).direction === 'rtl');
    if (to === null) return;
    e.preventDefault(); e.stopPropagation();
    all[to]?.focus();
  }
</script>

<div class="pop card menu" role="menu" aria-label={label} tabindex="-1" bind:this={el} {onkeydown}>
  {#each entries as m (m.id)}
    {#if m.kind === 'choice'}
      <div class="menu-row" role="group" aria-labelledby="menu-{m.id}">
        <span class="menu-label" id="menu-{m.id}">{#if m.icon}<Icon name={m.icon} />{/if}{m.label}</span>
        <span class="menu-opts">
          {#each m.options as o (o.id)}
            <button class="btn" role="menuitemradio" aria-checked={m.value === o.id} class:on={m.value === o.id} lang={o.lang} tabindex="-1"
              onclick={() => m.pick(o.id)}>{#if o.swatch}<span class="swatch" style:background={o.swatch}></span>{/if}{o.label}</button>
          {/each}
        </span>
      </div>
    {:else if m.kind === 'toggle'}
      <button class="btn menu-item" role="menuitemcheckbox" aria-checked={m.on} tabindex="-1" onclick={() => m.set(!m.on)}>
        {#if m.icon}<Icon name={m.icon} />{/if}<span>{m.label}: <b>{m.state}</b></span>
      </button>
    {:else}
      <button class="btn menu-item" role="menuitem" tabindex="-1" onclick={() => { onclose(false); m.run(); }}>
        {#if m.icon}<Icon name={m.icon} />{/if}<span>{m.label}</span>
      </button>
    {/if}
  {/each}
</div>
