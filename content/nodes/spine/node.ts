import { defineNode } from '$core/define';

// A spine switch of the data centre's leaf–spine (Clos) fabric; its dive shows the many equal roads (ECMP)
export default defineNode({
  kind: 'device',
  role: 'router',
  dive: 'leaf-spine',
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Clos_network', title: 'Clos network', level: 'nerd', lang: 'en' },
    { url: 'https://en.wikipedia.org/wiki/Equal-cost_multi-path_routing', title: 'Equal-cost multi-path routing', level: 'nerd', lang: 'en' },
    { url: 'https://www.rfc-editor.org/rfc/rfc7938', title: 'RFC 7938: BGP in large data centres', level: 'nerd', lang: 'en' },
  ],
});
