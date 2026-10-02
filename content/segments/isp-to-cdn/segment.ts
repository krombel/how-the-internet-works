import { defineSegment } from '$core/define';

// From the ISP's core to the video company's data centre: out through the ISP's border router, across an internet
// exchange (or, as a fallback, paid transit). Three networks: your internet company, the exchange and the video company
// (issue #20), whose data centre is the next segment.
export default defineSegment({
  hops: [
    { at: 'core', in: 'internet', owner: 'isp' },
    // still inside the ISP: label-switched (MPLS) across the country, to its edge in the data centre where the exchange is.
    // The way there crosses the sea (#39): the same trunk in a cable on the sea floor, its own stretch and dive
    { link: 'submarine', km: 180 },
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
        nodes: { core: [800, 770, 130], border: [1040, 442, 150, 'above'], transit: [850, 190, 120, 'above'], ixp: [1310, 645, 150], datacentre: [1495, 345, 160] },
        // bent just enough to keep the dive badges clear of each other
        links: { 'border-transit': { bend: 0.08 }, 'bng-core': { bend: 0.14 }, 'core-border': { bend: 0.3 }, 'border-ixp': { bend: 0.25 }, 'ixp-datacentre': { bend: 0.1 } },
        // the networks' signs (on the packets' way): over their devices' names, the exchange's under its own
        owners: { isp: [465, 252], ixp: [1409, 862], cdn: [1330, 195] },
      },
      portrait: {
        nodes: { core: [180, 870, 160], border: [700, 690, 150], transit: [765, 580, 100, 'above'], ixp: [190, 600, 150], datacentre: [647, 259, 150] },
        links: { 'border-transit': { bend: 0.08 }, 'border-ixp': { bend: 0.15 }, 'ixp-datacentre': { bend: -0.6 }, 'bng-core': { bend: 0 }, 'core-border': { bend: 0 } },
        // in the gaps the zigzag leaves
        owners: { isp: [280, 1048], ixp: [212, 425], cdn: [453, 102] },
      },
    },
  },
});
