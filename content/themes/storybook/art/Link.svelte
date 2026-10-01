<svelte:options namespace="svg" />
<script lang="ts">
  import type { LinkProps } from '$core/api';
  let { look, d, curve, colour, dashed, time, focused, kbd }: LinkProps = $props();
  /** The widest stroke each look draws (the keyboard's ring goes round it). */
  const w = $derived(look === 'trunk' ? 30 : 19);
  const dash = $derived((-time * 34).toFixed(1));
</script>

<g class="storybook-link link-{look}" class:focused>
  {#if kbd}
    <g class="kbd" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path class="kbd-gap" {d} stroke="var(--bg)" stroke-width={w + 30} />
      <path class="kbd-ink" {d} stroke="var(--ink)" stroke-width={w + 20} />
      <path class="kbd-gap" {d} stroke="var(--bg)" stroke-width={w + 8} />
    </g>
  {/if}
  {#if focused}<path {d} fill="none" stroke="var(--glow)" stroke-width={look === 'trunk' ? 38 : 24} stroke-linecap="round" stroke-linejoin="round" opacity="0.8" />{/if}
  {#if look === 'radio'}
    <path {d} fill="none" stroke="var(--line)" stroke-width="18" stroke-linecap="round" stroke-dasharray="1 25" stroke-dashoffset={dash} />
    <path {d} fill="none" stroke="var(--orange)" stroke-width="12" stroke-linecap="round" stroke-dasharray="1 25" stroke-dashoffset={dash} />
    <path {d} fill="none" stroke={colour} stroke-width="7" stroke-linecap="round" stroke-dasharray="1 25" stroke-dashoffset={Number(dash) - 11} />
    <path {d} fill="none" stroke="var(--sun)" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 25" stroke-dashoffset={Number(dash) - 22} />
  {:else if look === 'cable'}
    <path {d} fill="none" stroke="var(--line)" stroke-width="19" stroke-linecap="round" />
    <path {d} fill="none" stroke={colour} stroke-width="13" stroke-linecap="round" />
    <path {d} fill="none" stroke="var(--peach)" stroke-width="4" stroke-linecap="round" opacity="0.65" />
    <circle cx={curve.p0.x} cy={curve.p0.y} r="13" fill="var(--peach)" stroke="var(--line)" stroke-width="5" />
    <circle cx={curve.p1.x} cy={curve.p1.y} r="13" fill="var(--peach)" stroke="var(--line)" stroke-width="5" />
  {:else if look === 'fibre'}
    <path {d} fill="none" stroke="var(--line)" stroke-width="14" stroke-linecap="round" />
    <path {d} fill="none" stroke={colour} stroke-width="8" stroke-linecap="round" />
    <path {d} fill="none" stroke="var(--paper)" stroke-width="2.8" stroke-linecap="round" stroke-dasharray="28 18" stroke-dashoffset={-time * 55} opacity="0.9" />
  {:else}
    <path {d} fill="none" stroke="var(--line)" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" />
    <path {d} fill="none" stroke="var(--trunk)" stroke-width="21" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray={dashed ? '28 18' : undefined} />
    <path {d} fill="none" stroke="var(--paper)" stroke-width="4" stroke-linecap="round" stroke-dasharray="24 22" opacity="0.85" />
  {/if}
</g>
