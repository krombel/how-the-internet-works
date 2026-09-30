<svelte:options namespace="svg" />
<script lang="ts">
  // The cut-away house: one room with the phone, the Wi-Fi box on the wall and the home router; round windows up
  // in the gables (portrait: the router sits in the attic). Lit and cosy at night.
  import { Depth, view, type PlaceBackdropProps } from '$core/api';
  let { orient }: PlaceBackdropProps = $props();
  const portrait = $derived(orient === 'portrait');
  const night = $derived(view.mode === 'night');
</script>

{#snippet window(x: number, y: number, r: number)}
  <circle cx={x} cy={y} r={r} fill="var(--window)" stroke="var(--line)" stroke-width="6" />
  <path d="M{x - r} {y} H{x + r} M{x} {y - r} V{y + r}" stroke="var(--line)" stroke-width="4" />
{/snippet}

{#snippet lamp(x: number, y: number)}
  <!-- a ceiling lamp; at night it pools warm light into the room -->
  {#if night}<ellipse cx={x} cy={y + 120} rx="150" ry="120" fill="var(--lamp)" opacity="0.14" />{/if}
  <path d="M{x} {y} V{y + 34}" stroke="var(--line)" stroke-width="4" />
  <path d="M{x - 26} {y + 60} Q{x - 24} {y + 34} {x} {y + 34} Q{x + 24} {y + 34} {x + 26} {y + 60} Z" fill="var(--lamp)" stroke="var(--line)" stroke-width="5" stroke-linejoin="round" />
{/snippet}

<Depth d={1.03}>
  {#if portrait}
    <path d="M74 1000 H846 V1570 H74 Z" fill="var(--peach)" stroke="var(--line)" stroke-width="9" />
    <path d="M29 1005 L464 640 L889 1005 Z" fill="var(--roof)" stroke="var(--line)" stroke-width="9" stroke-linejoin="round" />
    <!-- the attic, cut away: the home router lives up here -->
    <path d="M150 980 L464 716 L770 980 Z" fill="var(--room)" stroke="var(--line)" stroke-width="5" stroke-linejoin="round" opacity="0.74" />
    <path d="M118 1040 H802 V1536 H118 Z" fill="var(--room)" stroke="var(--line)" stroke-width="5" opacity="0.74" />
    <path d="M118 1506 H802 V1536 H118 Z" fill="var(--wood)" stroke="var(--line)" stroke-width="5" />
    {@render lamp(420, 1040)}
  {:else}
    <g transform="translate(54 290)">
      <path d="M55 130 H1070 V500 H55 Z" fill="var(--peach)" stroke="var(--line)" stroke-width="9" />
      <path d="M0 136 L275 0 L555 136 Z" fill="var(--roof)" stroke="var(--line)" stroke-width="9" stroke-linejoin="round" />
      <path d="M555 136 L795 12 L1128 136 Z" fill="var(--orange-soft)" stroke="var(--line)" stroke-width="9" stroke-linejoin="round" />
      {@render window(275, 84, 24)}
      {@render window(795, 90, 24)}
      <path d="M110 176 H1020 V468 H110 Z" fill="var(--room)" stroke="var(--line)" stroke-width="5" opacity="0.74" />
      <path d="M110 438 H1020 V468 H110 Z" fill="var(--wood)" stroke="var(--line)" stroke-width="5" />
      {@render lamp(256, 176)}
    </g>
  {/if}
</Depth>
