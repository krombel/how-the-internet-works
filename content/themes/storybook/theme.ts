import { defineTheme } from '$core/api';
import './tokens.css';
import Backdrop from './art/Backdrop.svelte';
import Device from './art/Device.svelte';
import Link from './art/Link.svelte';
import Packet from './art/Packet.svelte';
import Hint from './art/Hint.svelte';
import Tag from './art/Tag.svelte';
import Label from './art/Label.svelte';
import Panel from './art/Panel.svelte';
import Overlay from './art/Overlay.svelte';

export default defineTheme({
  id: 'storybook',
  themeColor: '#ffeccf',
  scheme: 'light',
  night: { themeColor: '#1c2048', scheme: 'dark' },
  labelMinPx: 14,
  motion: { speed: 1 },
  timbre: { wave: 'triangle', blip: 660, noise: { freq: 820, q: 0.75 }, gain: 0.28, detune: 4, decay: 0.22 },
  art: { Backdrop, Device, Link, Packet, Hint, Tag, Label, Panel, Overlay },
});
