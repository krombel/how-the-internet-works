import { defineSegment } from '$core/define';

// From the ISP's core to the video server: out through the ISP's border router, across an internet exchange (or, as a
// fallback, paid transit). Three networks: your internet company, the exchange and the video company (issue #20).
export default defineSegment({
  hops: [
    { at: 'core', in: 'internet', owner: 'isp' },
    // still inside the ISP: label-switched (MPLS) across the country, to its edge in the data centre where the exchange is
    { link: 'backbone', km: 180 },
    // the ISP's door to the other networks: it pops the last label (#25)
    { at: 'border', in: 'internet', owner: 'isp' },
    // the exchange is one big shared Ethernet switch: no MPLS labels across it
    { link: 'backbone', stack: ['ethernet'], km: 0.2 },
    { at: 'ixp', in: 'internet', owner: 'ixp' },
    { link: 'backbone', stack: ['ethernet'], km: 0.3 },
    { at: 'cdn', in: 'internet', addr: '198.51.100.20', owner: 'cdn' },
  ],
  // the other door: a carrier the ISP pays to reach everything the exchange doesn't
  aside: [{ at: 'transit', in: 'internet', from: 'border', link: 'backbone', owner: 'transit' }],
  layout: {
    internet: {
      landscape: {
        nodes: { core: [822, 680, 160], border: [1025, 450, 150, 'above'], transit: [1095, 170, 120, 'above'], ixp: [1240, 680, 150], cdn: [1430, 450, 160, 'above'] },
        links: { 'border-transit': { bend: 0.08 } },
        // the networks' signs (on the packets' way): over their devices' names, the exchange's under its own
        owners: { isp: [465, 265], ixp: [1385, 845], cdn: [1320, 265] },
      },
      portrait: {
        nodes: { core: [250, 870, 160], border: [640, 720, 150], transit: [720, 540, 100, 'above'], ixp: [260, 560, 150], cdn: [600, 330, 160, 'above'] },
        links: { 'border-transit': { bend: 0.08 } },
        // in the gaps the zigzag leaves
        owners: { isp: [280, 1050], ixp: [220, 445], cdn: [270, 250] },
      },
    },
  },
});
