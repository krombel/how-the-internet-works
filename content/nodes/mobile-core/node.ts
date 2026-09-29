import { defineNode } from '$core/define';

export default defineNode({
  kind: 'device',
  role: 'nat',
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/5G', title: '5G (core network)', level: 'nerd', lang: 'en' },
    { url: 'https://en.wikipedia.org/wiki/Carrier-grade_NAT', title: 'Carrier-grade NAT', level: 'nerd', lang: 'en' },
  ],
});
