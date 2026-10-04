import { defineScene } from '$core/define';

export default defineScene({
  explains: 'layer',
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Network_switch', title: 'Network switch', level: 'nerd', lang: 'en' },
    { url: 'https://www.rfc-editor.org/rfc/rfc826', title: 'RFC 826: ARP', level: 'nerd', lang: 'en' },
    { url: 'https://en.wikipedia.org/wiki/IEEE_802.1Q', title: 'IEEE 802.1Q (VLANs)', level: 'nerd', lang: 'en', eras: ['2010', 'today'] },
    { url: 'https://www.rfc-editor.org/rfc/rfc3031', title: 'RFC 3031: MPLS architecture', level: 'nerd', lang: 'en', eras: ['2010', 'today'] },
  ],
});
