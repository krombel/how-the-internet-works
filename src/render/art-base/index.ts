// Default art slots. Every slot is driven only by CSS tokens, so a new theme can start from tokens.css alone
// and override the slots that matter for its look.
import type { ArtSlots, Theme, ThemeInput } from '../theme-types';
import Defs from './Defs.svelte';
import Backdrop from './Backdrop.svelte';
import Device from './Device.svelte';
import Link from './Link.svelte';
import Packet from './Packet.svelte';
import Hint from './Hint.svelte';
import Region from './Region.svelte';
import Road from './Road.svelte';
import Tag from './Tag.svelte';
import Label from './Label.svelte';
import Panel from './Panel.svelte';
import Overlay from './Overlay.svelte';

const baseArt: ArtSlots = { Defs, Backdrop, Road, Device, Link, Packet, Hint, Region, Tag, Label, Panel, Overlay };

export const defineTheme = (t: ThemeInput): Theme => ({ ...t, art: { ...baseArt, ...t.art } });
