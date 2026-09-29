import { defineSegment } from '$core/define';

// From the ISP's core to the video server: across an internet exchange (or, as a fallback, paid transit).
export default defineSegment({
  hops: [
    { at: 'core', in: 'internet' },
    // the exchange is one big shared Ethernet switch: no MPLS labels across it
    { link: 'backbone', stack: ['ethernet'] },
    { at: 'ixp', in: 'internet' },
    { link: 'backbone', stack: ['ethernet'] },
    { at: 'cdn', in: 'internet', addr: '198.51.100.20' },
  ],
  aside: [{ at: 'transit', in: 'internet', from: 'core', link: 'backbone' }],
  layout: {
    internet: {
      landscape: {
        nodes: { core: [990, 640, 170], transit: [1000, 200, 140, 'above'], ixp: [1230, 450, 170, 'above'], cdn: [1470, 640, 160] },
        links: { 'core-transit': { bend: 0.08 } },
      },
      portrait: {
        nodes: { core: [260, 720, 180], transit: [150, 480, 140], ixp: [670, 520, 180], cdn: [330, 270, 180] },
        links: { 'core-transit': { bend: 0.08 } },
      },
    },
  },
});
