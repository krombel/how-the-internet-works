import { defineNode } from '$core/define';

// The top-of-rack switch: the leaf of the fabric, on top of one rack of servers
export default defineNode({
  kind: 'device',
  role: 'router',
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/19-inch_rack', title: '19-inch rack', level: 'both', lang: 'en' },
    { url: 'https://en.wikipedia.org/wiki/Network_switch', title: 'Network switch', level: 'nerd', lang: 'en' },
  ],
});
