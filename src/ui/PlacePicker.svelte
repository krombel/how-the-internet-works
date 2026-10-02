<script lang="ts">
  // "Where are you?" / "What are you doing?": every place folder is offered in every activity (unless the activity's
  // slot says `only`). A place's variants (other ways of getting online from it) are not places of their own: when
  // the chosen place has some, "How do you get online?" offers them. A card on wide screens, a bottom sheet on phones.
  import { onMount } from 'svelte';
  import { activityIds, basePlace, content, placeFamily } from '../model/registry';
  import { resolveRoute } from '../model/resolve';
  import { deviceArt, loadRouteArt } from '../render/lazy.svelte';
  import { themeState, tr, view } from '../state.svelte';
  import Icon from './Icon.svelte';
  import { iconOf } from './picker';

  let { places, activity, slot, onpick, onclose }: {
    places: string[]; activity: string; slot: number;
    onpick: (p: { places?: string[]; activity?: string }) => void; onclose: () => void;
  } = $props();
  const A = $derived(themeState.current.art);
  const allowed = $derived.by(() => {
    const s = content.activities[activity]?.route.filter((x) => 'place' in x)[slot];
    const only = s && 'only' in s ? s.only : undefined;
    return Object.values(content.places).filter((p) => !only || only.includes(p.id)).sort((a, b) => (a.order ?? 99) - (b.order ?? 99)).map((p) => p.id);
  });
  /** One option per place: the first of its family (itself, or a variant when the place isn't allowed here). */
  const options = $derived(allowed.filter((id) => placeFamily(id, allowed)[0] === id));
  const here = $derived(places[slot]);
  const family = $derived(placeFamily(here, allowed));
  let dialog: HTMLDivElement;
  onMount(() => dialog.querySelector<HTMLButtonElement>('.option.on, .option')?.focus());
  const placesWith = (id: string) => places.map((p, i) => (i === slot ? id : p));
  const choose = (id: string) => onpick({ places: placesWith(id) });
  /** Pointed at or focused: fetch that place's art ahead of the tap (#91). */
  const ahead = (id: string) => void loadRouteArt(resolveRoute({ activity, places: placesWith(id) }));
  const inFamily = (id: string) => basePlace(id) === basePlace(here);
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (onclose(), e.stopPropagation())} />
<div class="picker-back" data-ui onclick={onclose} role="presentation"></div>
<div class="picker card" bind:this={dialog} class:sheet={view.orient === 'portrait'} data-ui role="dialog" aria-modal="true" aria-labelledby="pick-where">
  <header>
    <h2 id="pick-where">{tr('pick.where')}</h2>
    <button class="btn" onclick={onclose} aria-label={tr('ui.close')}><Icon name="close" /></button>
  </header>
  <div class="options">
    {#each options as p (p)}
      {@const icon = iconOf(p)}
      {@const art = deviceArt(icon)}
      <button class="btn option" class:on={inFamily(p)} aria-pressed={inFamily(p)} onclick={() => choose(inFamily(p) ? here : p)}
        onpointerenter={() => ahead(p)} onfocus={() => ahead(p)}>
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <A.Device id={icon} Art={art.Art} face={art.face} pending={art.pending} x={100} y={100} size={190} time={view.time} context="dive" focused={false} />
        </svg>
        <span>{tr(`place.${basePlace(p)}.name`)}</span>
      </button>
    {/each}
  </div>
  {#if family.length > 1}
    <h2>{tr('pick.access')}</h2>
    <div class="options">
      {#each family as v (v)}
        <button class="btn option row" class:on={v === here} aria-pressed={v === here} onclick={() => choose(v)} onpointerenter={() => ahead(v)} onfocus={() => ahead(v)}>
          <span>{tr(`place.${v}.access`)}</span>
        </button>
      {/each}
    </div>
  {/if}
  <h2>{tr('pick.what')}</h2>
  <div class="options">
    {#each activityIds() as a (a)}
      <button class="btn option wide" class:on={a === activity} aria-pressed={a === activity} onclick={() => onpick({ activity: a })}>
        <span>{tr(`activity.${a}.title`)}</span>
      </button>
    {/each}
  </div>
</div>
