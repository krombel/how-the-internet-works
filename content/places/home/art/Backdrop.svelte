<svelte:options namespace="svg" />
<script lang="ts">
  // The cut-away house the phone, the Wi-Fi box and the router live in (just in front of the scene plane).
  import { Depth, type PlaceBackdropProps } from '$core/api';
  let { orient }: PlaceBackdropProps = $props();
  const portrait = $derived(orient === 'portrait');
</script>

<Depth d={1.03}>
  {#if portrait}
    <g transform="translate(34 1070)">
      <path d="M40 230 H812 V500 H40 Z" fill="var(--peach)" stroke="var(--line)" stroke-width="9" />
      <path d="M-5 235 L430 20 L855 235 Z" fill="var(--roof)" stroke="var(--line)" stroke-width="9" stroke-linejoin="round" />
      <path d="M93 288 H740 V468 H93 Z" fill="var(--paper-2)" stroke="var(--line)" stroke-width="5" opacity="0.72" />
      <path d="M420 286 V468 M96 374 H738" stroke="var(--line)" stroke-width="4" opacity="0.25" />
    </g>
  {:else}
    <g transform="translate(54 290)">
      <path d="M55 130 H1070 V500 H55 Z" fill="var(--peach)" stroke="var(--line)" stroke-width="9" />
      <path d="M0 136 L275 0 L555 136 Z" fill="var(--roof)" stroke="var(--line)" stroke-width="9" stroke-linejoin="round" />
      <path d="M555 136 L795 12 L1128 136 Z" fill="var(--orange-soft)" stroke="var(--line)" stroke-width="9" stroke-linejoin="round" />
      <path d="M120 190 H1020 V452 H120 Z" fill="var(--paper-2)" stroke="var(--line)" stroke-width="5" opacity="0.74" />
      <path d="M505 188 V452 M120 318 H1020" stroke="var(--line)" stroke-width="4" opacity="0.24" />
    </g>
  {/if}
</Depth>
