<script lang="ts">
  // The time machine (#59): "When?", one stop per era (`eraStops`), oldest first, each with its year, its way online
  // and a picture of the device you'd start on then (a PC, a laptop, a phone). A native radio group, so the arrow keys
  // (or a tap) choose an era, its text shows below, and a screen reader says "1995, Dial-up, 1 of 3"; the button (or
  // Enter) travels there: a place switch with the start device's steps carried over (`eraTrip`), done by App.svelte,
  // which is told what to say first on landing (`landing`). Where the place has no way online in an era, the stop
  // is that era's own trip, and a line says so (also in the radio's description, so it is heard before going). A
  // dialog like the place picker: a card on wide screens, a bottom sheet on a portrait phone, one compact row (no
  // pictures, no era text) in short landscape. It loads, with the era strings, when its button is pointed at.
  import { onMount, untrack } from 'svelte';
  import { isShort } from '../engine/camera';
  import { nodeArt } from '../model/components';
  import type { EraStop } from '../model/era';
  import { eraTrip } from '../model/era-trip';
  import type { Loc } from '../model/location';
  import { content } from '../model/registry';
  import { fill, themeState, tr, trFirst, trl, view } from '../state.svelte';
  import Icon from './Icon.svelte';
  import { elsewhere as elsewhereFrom, landing } from './time';

  let { stops, here, at, onpick, onclose }: {
    stops: EraStop[];
    /** The era you are in (one of the stops), and where you are. */
    here: string; at: Pick<Loc, 'places' | 'activity' | 'path'>;
    /** Travel: where to, and what to say first on landing ("It's 1995."). */
    onpick: (to: { trip: ReturnType<typeof eraTrip>; said: string }) => void; onclose: () => void;
  } = $props();
  const elsewhere = (s: EraStop) => elsewhereFrom(s, at.places[0]);
  const A = $derived(themeState.current.art);
  const short = $derived(isShort(view.vp.w, view.vp.h));
  let chosen = $state(untrack(() => here));
  const stop = $derived(stops.find((s) => s.era === chosen)!);
  /** A stop's picture: the device you start on then (its first hop). */
  const deviceOf = (place: string) => {
    const h = content.places[place].hops.find((h) => 'at' in h) as { at: string; node?: string };
    return h.node ?? h.at;
  };
  const go = (s: EraStop) => (s.era === here ? onclose() : onpick({ trip: eraTrip(at, s.place), said: landing(s, at.places[0]) }));
  let form: HTMLFormElement;
  // checked and focused from here, not by a `checked` attribute (whose runtime would load up front, with the app)
  onMount(() => {
    const r = form.querySelector<HTMLInputElement>('input[data-here]')!;
    r.checked = true;
    r.focus();
  });
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (e.preventDefault(), onclose(), e.stopPropagation())} />
<div class="picker-back" data-ui onclick={onclose} role="presentation"></div>
<div class="picker card time" class:sheet={view.orient === 'portrait'} class:compact={short} data-ui role="dialog" aria-modal="true" aria-labelledby="time-title">
  <form bind:this={form} onsubmit={(e) => { e.preventDefault(); go(stop); }}>
    <h2 id="time-title"><Icon name="time" />{tr('time.title')}</h2>
    <button type="button" class="btn close" onclick={onclose} aria-label={tr('ui.close')}><Icon name="close" /></button>
    <fieldset>
      <legend class:sr={short}>{tr('time.when')}</legend>
      <div class="stops">
        {#each stops as s (s.era)}
          {@const device = deviceOf(s.place)}
          {@const art = nodeArt[device]}
          <label class="stop" class:on={s.era === chosen}>
            <input type="radio" name="era" data-here={s.era === here || undefined} onchange={() => (chosen = s.era)} aria-describedby="time-d-{s.era}"
              onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), go(s))} />
            {#if !short}
              <svg viewBox="0 0 200 200" aria-hidden="true">
                <A.Device id={device} Art={art?.default ?? null} face={art?.face ?? null} x={100} y={100} size={190} time={view.time} context="dive" focused={false} />
              </svg>
            {/if}
            <span class="year">{tr(`era.${s.era}.name`)}</span>
            <span class="way">{trFirst([`place.${s.place}.access`, `place.${s.place}.name`])}</span>
            {#if s.era === here}<span class="now">{tr('map.here')}</span>{/if}
          </label>
        {/each}
      </div>
      <!-- each era's text, its radio's description (and the picture's, as the scene would say it) -->
      <div hidden>
        {#each stops as s (s.era)}<p id="time-d-{s.era}">{elsewhere(s)} {trl(`era.${s.era}`)} {trl(`era.${s.era}.describe`)}</p>{/each}
      </div>
    </fieldset>
    {#if stop.instead}<p class="instead" aria-hidden="true"><Icon name="time" />{elsewhere(stop)}</p>{/if}
    {#if !short}<p class="text" aria-hidden="true">{trl(`era.${chosen}`)}</p>{/if}
    <button type="submit" class="btn go">
      {chosen === here ? tr('time.stay') : fill(tr('time.go'), { era: tr(`era.${chosen}.name`) })}
    </button>
  </form>
</div>

<style>
  form { display: grid; grid-template-columns: 1fr auto; grid-template-areas: 'title close' 'dial dial' 'instead instead' 'text text' 'go go'; gap: 0 8px; }
  h2 { grid-area: title; display: flex; align-items: center; gap: 8px; }
  h2 :global(svg) { width: 22px; height: 22px; flex: none; }
  .close { grid-area: close; align-self: start; }
  fieldset { grid-area: dial; min-width: 0; margin: 0; padding: 0; border: 0; }
  legend { padding: 0; margin-bottom: 8px; font-size: 15px; font-weight: 800; }
  .stops { display: flex; gap: 10px; overflow-x: auto; padding: 4px 2px; }
  /* a stop: its radio (the engine's focus ring), picture, year, way online and the "you are here" mark */
  .stop { flex: 1 0 104px; position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; min-height: 44px;
    padding: 10px 8px 12px; border: 3px solid transparent; border-radius: 18px; background: var(--btn); cursor: pointer; text-align: center; }
  .stop.on { border-color: var(--accent); }
  .stop input { position: absolute; top: 6px; inset-inline-start: 6px; width: 24px; height: 24px; margin: 0; accent-color: var(--accent); }
  .stop svg { width: 72px; height: 72px; overflow: visible; }
  .year { font-family: var(--heading-font); font-weight: var(--heading-weight); font-size: 22px; }
  .way { font-size: 13px; font-weight: 700; }
  .now { margin-top: 4px; padding: 1px 8px; border-radius: 99px; background: var(--btn-on); color: var(--btn-on-ink); font-size: 12px; font-weight: 800; }
  /* the era's own trip, somewhere else: said in words, marked with the clock */
  .instead { grid-area: instead; display: flex; gap: 8px; align-items: flex-start; margin: 10px 2px 0; font-size: 15px; font-weight: 700; line-height: 1.35; }
  .instead :global(svg) { width: 20px; height: 20px; flex: none; margin-top: 1px; }
  .text { grid-area: text; margin: 10px 2px 0; min-height: 4.2em; font-size: 15px; line-height: 1.4; }
  .go { grid-area: go; justify-self: end; min-height: 44px; margin-top: 10px; padding: 8px 18px; background: var(--btn-on); color: var(--btn-on-ink); font-size: 16px; }
  /* short landscape: the title row with the button, then the eras in a row; no pictures, no text */
  .compact { padding-block: 8px 10px; }
  .compact form { grid-template-columns: 1fr auto auto; grid-template-areas: 'title go close' 'dial dial dial' 'instead instead instead'; align-items: center; gap: 6px 10px; }
  .compact .instead { margin-top: 0; font-size: 13px; }
  .compact h2 { margin: 0; }
  .compact .stop { padding: 6px 8px 8px 38px; align-items: flex-start; text-align: start; }
  .compact .stop input { top: 50%; translate: 0 -50%; }
  .compact .year { font-size: 18px; }
  .compact .now { margin-top: 2px; font-size: 11px; white-space: nowrap; }
  .compact .go { margin-top: 0; }
</style>
