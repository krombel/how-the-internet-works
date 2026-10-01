import { defineSegment } from '$core/define';

// Inside the video company's data centre (issue #35): in at its edge router, past a load balancer that picks a server,
// across the leaf–spine fabric to a rack, and into the cache server on it. A cache miss goes on to the origin, the main
// copy in a cloud region far away (a side branch: most requests never go there).
export default defineSegment({
  hops: [
    { at: 'dc-router', in: 'datacentre', owner: 'cdn' },
    { link: 'dc-fibre', km: 0.05 },
    { at: 'load-balancer', in: 'datacentre', owner: 'cdn' },
    { link: 'dc-fibre', km: 0.05 },
    { at: 'spine', in: 'datacentre', owner: 'cdn' },
    { link: 'dc-fibre', km: 0.05 },
    { at: 'rack-switch', in: 'datacentre', owner: 'cdn' },
    { link: 'dc-fibre', km: 0.005 },
    { at: 'cdn', in: 'datacentre', addr: '198.51.100.20', owner: 'cdn' },
  ],
  aside: [{ at: 'origin', in: 'datacentre', from: 'cdn', link: 'backbone', owner: 'cloud' }],
  layout: {
    datacentre: {
      landscape: {
        nodes: {
          ixp: [190, 780, 120], 'dc-router': [440, 450, 150, 'above'], 'load-balancer': [620, 690, 150], spine: [870, 390, 150],
          'rack-switch': [1110, 710, 150], cdn: [1330, 470, 160], origin: [1490, 200, 120],
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
