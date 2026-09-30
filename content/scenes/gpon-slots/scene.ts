import { defineScene } from '$core/define';

export default defineScene({
  explains: 'layer',
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/GPON', title: 'GPON', level: 'kid', lang: 'en' },
    { url: 'https://en.wikipedia.org/wiki/Passive_optical_network', title: 'Passive optical network', level: 'both', lang: 'en' },
    { url: 'https://en.wikipedia.org/wiki/Dynamic_bandwidth_allocation', title: 'Dynamic bandwidth allocation', level: 'nerd', lang: 'en' },
    { url: 'https://www.itu.int/rec/T-REC-G.984.3', title: 'ITU-T G.984.3', level: 'nerd', lang: 'en' },
  ],
});
