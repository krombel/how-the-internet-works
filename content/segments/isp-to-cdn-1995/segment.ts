import { defineSegment } from '$core/define';

// From the small ISP's one router to a server room in America, in 1995 (#59): circuits and timeslots all the way, until
// an American backbone of ATM. The ISP buys its whole internet as one leased E1 from a bigger network in Copenhagen,
// whose circuits cross the Atlantic in CANTAT-3; a big American network carries the page's parcels across the country
// and into the server room on a T1. Danish traffic alone goes to DIX, the Danish exchange, on its own E1 (the aside).
// Its words are the base's '1995' block (segments/isp-to-cdn/locales).
export default defineSegment({
  variantOf: 'isp-to-cdn',
  era: '1995',
  hops: [
    { at: 'core', in: 'internet', owner: 'isp' },
    // a leased 2 Mbit/s line across Denmark, to the upstream network in Copenhagen
    { link: 'e1', km: 150 },
    { at: 'transit', in: 'internet', owner: 'transit' },
    // to Blåbjerg on the west coast (~300 km), CANTAT-3 to Nova Scotia (~7,100 km), on to New York (~1,000 km)
    { link: 'submarine-sdh', km: 8400 },
    // where the circuit meets the American network, and the backbone's PoP near the web server, across the country
    { at: 'backbone', node: 'backbone-router', in: 'internet', owner: 'us-backbone' },
    { link: 'atm', km: 1500 },
    { at: 'pop', node: 'backbone-router', in: 'internet', owner: 'us-backbone' },
    { link: 't1', km: 15 },
  ],
  // DIX (1994, at DTU in Lyngby): the ISP's door to the other Danish networks; a page from America never goes there
  aside: [{ at: 'ixp', in: 'internet', from: 'core', link: 'e1', owner: 'ixp' }],
  layout: {
    internet: {
      landscape: {
        nodes: { core: [700, 810, 130], ixp: [970, 719, 110, 'above'], transit: [951, 200, 120], backbone: [1057, 528, 120, 'above'], pop: [1401, 659, 120], datacentre: [1480, 260, 150] },
        links: { 'bng-core': { bend: 0.14 } },
        owners: { isp: [420, 200], transit: [642, 90], 'us-backbone': [1350, 860], cdn: [1273, 90] },
      },
      portrait: {
        nodes: { core: [150, 824, 150, 'above'], ixp: [157, 1184, 100], transit: [800, 710, 140, 'above'], backbone: [202, 484, 140], pop: [800, 325, 140], datacentre: [349, 142, 150] },
        links: { 'bng-core': { bend: 0 } },
        owners: { isp: [213, 1009], transit: [751, 817], 'us-backbone': [366, 304], cdn: [641, 60] },
      },
    },
    // the server room's way in: the backbone's PoP, where its T1 starts
    datacentre: {
      landscape: { nodes: { pop: [260, 770, 120] } },
      portrait: { nodes: { pop: [200, 1450, 130] } },
    },
  },
});
