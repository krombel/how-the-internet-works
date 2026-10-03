import { defineSegment } from '$core/define';

// The data centre of 2010 (#59): a rented cage at a colocation centre, built as a three-tier tree. In at the core
// router, past a load balancer, through an aggregation switch (where the racks' uplinks end and spanning tree blocks
// the spare ones) to the rack's access switch, and on copper into the cache server. 10G fibre between the switches,
// 1G copper to the server. The hop ids are today's ('spine' is drawn by the aggregation switch, and the access switch
// keeps 'rack-switch'), so links and dives carry over between eras.
// Its words are the base's '2010' block (segments/datacentre/locales).
export default defineSegment({
  variantOf: 'datacentre',
  era: '2010',
  hops: [
    { at: 'dc-router', in: 'datacentre', owner: 'cdn' },
    { link: 'dc-fibre', km: 0.05, rate: { down: 10e9, up: 10e9 } },
    { at: 'load-balancer', in: 'datacentre', owner: 'cdn' },
    { link: 'dc-fibre', km: 0.05, rate: { down: 10e9, up: 10e9 } },
    { at: 'spine', node: 'aggregation', in: 'datacentre', owner: 'cdn' },
    { link: 'dc-fibre', km: 0.05, rate: { down: 10e9, up: 10e9 } },
    // layer 2 ends at the aggregation switch: the access switch only bridges
    { at: 'rack-switch', in: 'datacentre', owner: 'cdn', role: 'bridge' },
    { link: 'ethernet', km: 0.005 },
    { at: 'cdn', in: 'datacentre', addr: '198.51.100.20', owner: 'cdn' },
  ],
  aside: [{ at: 'origin', in: 'datacentre', from: 'cdn', link: 'backbone', owner: 'cloud' }],
  layout: {
    datacentre: {
      landscape: {
        nodes: {
          ixp: [260, 770, 120], 'dc-router': [440, 450, 150, 'above'], 'load-balancer': [620, 684, 150], spine: [870, 390, 150],
          'rack-switch': [1090, 720, 150], cdn: [1350, 450, 160], origin: [1490, 200, 120],
        },
        links: { 'cdn-origin': { bend: 0.1 } },
        owners: { cdn: [440, 225] },
      },
      portrait: {
        nodes: {
          ixp: [200, 1450, 130], 'dc-router': [700, 1290, 150], 'load-balancer': [230, 1040, 150], spine: [660, 840, 150],
          'rack-switch': [230, 640, 150], cdn: [660, 440, 160], origin: [200, 300, 110],
        },
        links: { 'cdn-origin': { bend: 0.1 } },
        owners: { cdn: [330, 150] },
      },
    },
  },
});
