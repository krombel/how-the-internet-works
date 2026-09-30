import { definePlace } from '$core/define';

// Out on the street: the phone on 5G, a cell tower up the road, and the mobile operator's core network.
export default definePlace({
  order: 2,
  hops: [
    { at: 'phone', addr: '100.64.12.7' },
    { link: 'nr' },
    { at: 'cell-tower', addr: '10.20.0.5' },
    // the tower tunnels your packets (GTP-U) to the mobile core over fibre
    { link: 'metro-fibre', stack: ['ethernet', 'gtp'] },
    // carrier-grade NAT: thousands of phones share one outside address, so it hands out ports too
    { at: 'mobile-core', in: 'internet', addr: '10.20.0.1', natTo: '192.0.2.44:20517' },
    { link: 'backbone' },
  ],
  layout: {
    overview: {
      landscape: {
        // the shops stand back down the road, so the 5G hop crosses open sky
        nodes: { phone: [650, 610, 200], 'cell-tower': [920, 420, 260, 'above'] },
        links: {
          'phone-cell-tower': { bend: -0.2, label: [-20, -58] },
          'cell-tower-internet': { bend: 0.3, label: [-20, 74] },
        },
      },
      portrait: {
        nodes: { phone: [250, 1330, 250], 'cell-tower': [640, 900, 280] },
        links: {
          'phone-cell-tower': { bend: 0.16, label: [-40, -60] },
          'cell-tower-internet': { bend: 0.16, label: [-70, -40] },
        },
      },
    },
    internet: {
      landscape: { nodes: { 'cell-tower': [130, 640, 150], 'mobile-core': [520, 460, 190, 'above'] } },
      portrait: { nodes: { 'cell-tower': [220, 1440, 160], 'mobile-core': [640, 1150, 200] } },
    },
  },
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/5G', title: '5G', level: 'both', lang: 'en' },
    { url: 'https://da.wikipedia.org/wiki/5G', title: '5G', level: 'both', lang: 'da' },
  ],
});
