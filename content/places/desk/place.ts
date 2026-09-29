import { definePlace } from '$core/define';

// At the desk at home: a laptop on a network cable straight into the home router, then the same fibre as at home.
export default definePlace({
  order: 3,
  hops: [
    { at: 'laptop', addr: '192.168.1.40' },
    { link: 'ethernet' },
    { at: 'router', addr: '192.168.1.1', natTo: '203.0.113.7:61757' },
    { link: 'gpon' },
    { at: 'cabinet', in: 'internet' },
    { link: 'metro-fibre', stack: ['ethernet', 'vlan'] },
    { at: 'backhaul', in: 'internet' },
    { link: 'metro-fibre', stack: ['ethernet', 'vlan'] },
    { at: 'bng', in: 'internet' },
    { link: 'backbone' },
  ],
  entry: { internet: 'home' },
  layout: {
    overview: {
      landscape: {
        nodes: { laptop: [420, 575, 220], router: [1010, 580, 200] },
        links: {
          'laptop-router': { bend: -0.18, label: [0, 60] },
          'router-internet': { curve: [[1100, 570], [1250, 580], [1290, 430]], label: [40, 70] },
        },
      },
      portrait: {
        nodes: { laptop: [300, 1320, 260], router: [560, 900, 230] },
        links: {
          'laptop-router': { bend: 0.16, label: [95, 10] },
          'router-internet': { bend: 0.16, label: [-60, -50] },
        },
      },
    },
    internet: {
      landscape: { nodes: { home: [110, 640, 130], cabinet: [320, 450, 160, 'above'], backhaul: [540, 640, 160], bng: [760, 450, 160, 'above'] } },
      portrait: { nodes: { home: [220, 1450, 140], cabinet: [670, 1290, 170], backhaul: [230, 1100, 170], bng: [670, 910, 170] } },
    },
  },
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Ethernet_over_twisted_pair', title: 'Ethernet cables', level: 'nerd', lang: 'en' },
  ],
});
