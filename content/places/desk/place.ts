import { definePlace } from '$core/define';

// At the desk at home: a laptop on a network cable straight into the home router, then the same fibre as at home.
export default definePlace({
  order: 3,
  hops: [
    { at: 'laptop', addr: '192.168.1.40' },
    { link: 'ethernet', km: 0.003 },
    { at: 'router', addr: '192.168.1.1', natTo: '203.0.113.7:61757' },
    { link: 'gpon', km: 1.2 },
    { at: 'cabinet', in: 'internet', owner: 'isp' },
    { link: 'metro-fibre', stack: ['ethernet', 'vlan'], km: 6 },
    { at: 'backhaul', in: 'internet', owner: 'isp' },
    { link: 'metro-fibre', stack: ['ethernet', 'vlan'], km: 18 },
    { at: 'bng', in: 'internet', owner: 'isp' },
    { link: 'backbone', km: 25 },
  ],
  entry: { internet: 'home' },
  layout: {
    overview: {
      landscape: {
        nodes: { laptop: [420, 575, 220], router: [1010, 580, 200] },
        links: {
          'laptop-router': { bend: -0.18, label: [0, 60] },
          'router-internet': { curve: [[1100, 570], [1250, 580], [1290, 430]], label: [10, 70, 'start'] },
        },
      },
      portrait: {
        nodes: { laptop: [300, 1345, 250], router: [464, 885, 180, 'above'] },
        links: {
          'laptop-router': { bend: -0.2, label: [150, 0] },
          'router-internet': { curve: [[550, 880], [740, 700], [610, 480]], label: [100, -60] },
        },
      },
    },
    internet: {
      // the house a little higher than the backhaul switch, so their names (at their biggest, in short landscape) don't meet
      landscape: { nodes: { home: [140, 620, 120], cabinet: [285, 450, 150, 'above'], backhaul: [440, 680, 150], bng: [660, 450, 150, 'above'] } },
      portrait: { nodes: { home: [200, 1470, 130], cabinet: [640, 1330, 150], backhaul: [240, 1180, 150], bng: [720, 1030, 150] } },
    },
  },
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Ethernet_over_twisted_pair', title: 'Ethernet cables', level: 'nerd', lang: 'en' },
  ],
});
