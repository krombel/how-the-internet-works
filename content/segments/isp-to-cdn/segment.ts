import { defineSegment } from '$core/define';

// From the ISP's core to the video company's data centre: out through the ISP's border router, across an internet
// exchange (or, as a fallback, paid transit). Three networks: your internet company, the exchange and the video company
// (issue #20), whose data centre is the next segment.
export default defineSegment({
  hops: [
    { at: 'core', in: 'internet', owner: 'isp' },
    // still inside the ISP: label-switched (MPLS) across the country, to its edge in the data centre where the exchange is
    { link: 'backbone', km: 180 },
    // the ISP's door to the other networks: it pops the last label (#25)
    { at: 'border', in: 'internet', owner: 'isp' },
    // from here on everyone is in the same building: short cross-connects to the exchange's switch (one big shared
    // Ethernet, no MPLS labels across it) and from there into the video company's data centre, a few rooms away
    { link: 'cross-connect', km: 0.2 },
    { at: 'ixp', in: 'internet', owner: 'ixp' },
    { link: 'cross-connect', km: 0.3 },
  ],
  // the other door: a carrier the ISP pays to reach everything the exchange doesn't, met in the same building
  aside: [{ at: 'transit', in: 'internet', from: 'border', link: 'cross-connect', owner: 'transit' }],
  layout: {
    internet: {
      landscape: {
        nodes: { core: [822, 739, 160], border: [1012, 442, 150, 'above'], transit: [975, 184, 120, 'above'], ixp: [1272, 696, 150], datacentre: [1495, 367, 160] },
        // bent just enough to keep the dive badges clear of each other
        links: { 'border-transit': { bend: 0.08 }, 'bng-core': { bend: 0.14 }, 'core-border': { bend: -0.12 }, 'border-ixp': { bend: 0.19 }, 'ixp-datacentre': { bend: 0.1 } },
        // the networks' signs (on the packets' way): over their devices' names, the exchange's under its own
        owners: { isp: [465, 265], ixp: [1409, 862], cdn: [1366, 209] },
      },
      portrait: {
        nodes: { core: [250, 870, 160], border: [645, 706, 150], transit: [719, 527, 100, 'above'], ixp: [190, 651, 150], datacentre: [647, 259, 150] },
        links: { 'border-transit': { bend: 0.08 }, 'border-ixp': { bend: 0.15 }, 'ixp-datacentre': { bend: -0.34 } },
        // in the gaps the zigzag leaves
        owners: { isp: [280, 1050], ixp: [226, 480], cdn: [453, 102] },
      },
    },
  },
});
