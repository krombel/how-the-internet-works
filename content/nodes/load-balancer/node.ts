import { defineNode } from '$core/define';

// A layer-4 load balancer: it owns the service address and picks one of many servers for each connection
export default defineNode({
  kind: 'device',
  role: 'router',
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Load_balancing_(computing)', title: 'Load balancing', level: 'both', lang: 'en' },
    { url: 'https://en.wikipedia.org/wiki/Consistent_hashing', title: 'Consistent hashing', level: 'nerd', lang: 'en' },
  ],
});
