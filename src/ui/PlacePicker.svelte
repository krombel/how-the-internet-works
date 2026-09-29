<script lang="ts">
  // "Where are you?" / "What are you doing?": every place folder is offered in every activity (unless the activity's
  // slot says `only`). A card on wide screens, a bottom sheet on phones.
  import { onMount } from 'svelte';
  import { nodeArt } from '../model/components';
  import { activityIds, content } from '../model/registry';
  import { themeState, tr, view } from '../state.svelte';
  import Icon from './Icon.svelte';

  let { places, activity, slot, onpick, onclose }: {
    places: string[]; activity: string; slot: number;
    onpick: (p: { places?: string[]; activity?: string }) => void; onclose: () => void;
  } = $props();
  const A = $derived(themeState.current.art);
  const options = $derived.by(() => {
    const s = content.activities[activity]?.route.filter((x) => 'place' in x)[slot];
    const only = s && 'only' in s ? s.only : undefined;
    return Object.values(content.places).filter((p) => !only || only.includes(p.id)).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  });
  /** A place's picture: the first device after the start (Wi-Fi box, cell tower, …). */
  const iconOf = (id: string) => {
    const hops = content.places[id].hops.filter((h) => 'at' in h) as { at: string; node?: string }[];
    const h = hops[1] ?? hops[0];
    return h.node ?? h.at;
  };
  let dialog: HTMLDivElement;
  onMount(() => dialog.querySelector<HTMLButtonElement>('.option.on, .option')?.focus());
  const choose = (id: string) => onpick({ places: places.map((p, i) => (i === slot ? id : p)) });
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (onclose(), e.stopPropagation())} />
<div class="picker-back" data-ui onclick={onclose} role="presentation"></div>
<div class="picker card" bind:this={dialog} class:sheet={view.orient === 'portrait'} data-ui role="dialog" aria-modal="true" aria-labelledby="pick-where">
  <header>
    <h2 id="pick-where">{tr('pick.where')}</h2>
    <button class="btn" onclick={onclose} aria-label={tr('ui.close')}><Icon name="close" /></button>
  </header>
  <div class="options">
    {#each options as p (p.id)}
      {@const icon = iconOf(p.id)}
      {@const art = nodeArt[icon]}
      <button class="btn option" class:on={places[slot] === p.id} aria-pressed={places[slot] === p.id} onclick={() => choose(p.id)}>
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <A.Device id={icon} Art={art?.default ?? null} face={art?.face ?? null} x={100} y={100} size={190} time={view.time} context="dive" focused={false} />
        </svg>
        <span>{tr(`place.${p.id}.name`)}</span>
      </button>
    {/each}
  </div>
  <h2>{tr('pick.what')}</h2>
  <div class="options">
    {#each activityIds() as a (a)}
      <button class="btn option wide" class:on={a === activity} aria-pressed={a === activity} onclick={() => onpick({ activity: a })}>
        <span>{tr(`activity.${a}.title`)}</span>
      </button>
    {/each}
  </div>
</div>
