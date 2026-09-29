import { defineNode } from '$core/define';

export default defineNode({
  kind: 'device',
  role: 'router',
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Tier_1_network', title: 'Tier 1 network', level: 'nerd', lang: 'en' },
  ],
});
