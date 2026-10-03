import { defineSegment } from '$core/define';

// The server room of 1995 (#59): the backbone's T1 ends on the hosting site's router, and a 10BASE-T hub joins it to the
// one web server that holds the page. No load balancer, no fabric, no cache and no origin. The server keeps the hop id
// 'cdn' ("the server that sends it to you"), so links and dives carry over between eras.
// Its words are the base's '1995' block (segments/datacentre/locales).
export default defineSegment({
  variantOf: 'datacentre',
  era: '1995',
  hops: [
    { at: 'dc-router', in: 'datacentre', owner: 'cdn' },
    { link: 'ethernet', km: 0.01, rate: { down: 10e6, up: 10e6 } },
    { at: 'hub', in: 'datacentre', owner: 'cdn' },
    { link: 'ethernet', km: 0.005, rate: { down: 10e6, up: 10e6 } },
    { at: 'cdn', node: 'web-server', in: 'datacentre', addr: '198.51.100.20', owner: 'cdn' },
  ],
  layout: {
    datacentre: {
      // pop is the backbone's PoP, where the T1 in starts
      landscape: {
        nodes: { pop: [260, 770, 120], 'dc-router': [600, 560, 150], hub: [940, 690, 130], cdn: [1270, 470, 170] },
        owners: { cdn: [600, 225] },
      },
      portrait: {
        nodes: { pop: [200, 1450, 130], 'dc-router': [640, 1180, 150], hub: [260, 860, 130], cdn: [600, 480, 170] },
        owners: { cdn: [330, 150] },
      },
    },
  },
});
