<script lang="ts">
  import { ICON } from './icons';
  /** `solid`: its closed shapes filled too (the step buttons' arrow). */
  let { name, rotate = 0, solid = false }: { name: keyof typeof ICON; rotate?: number; solid?: boolean } = $props();
</script>

<svg viewBox="0 0 24 24" aria-hidden="true" fill={solid ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style:rotate="{rotate}deg"><path d={ICON[name]} /></svg>
