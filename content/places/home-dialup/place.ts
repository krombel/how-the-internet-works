import { definePlace } from '$core/define';

// At home in the 1990s, on dial-up: no Wi-Fi and no router. The computer's own modem phones the internet company,
// the telephone exchange connects the call, and the ISP's modems answer and hand the computer an address (PPP).
export default definePlace({
  variantOf: 'home',
  order: 1.6,
  hops: [
    { at: 'laptop', addr: '203.0.113.7' },
    { link: 'dialup', km: 2.5 },
    { at: 'exchange', in: 'internet' },
    { link: 'dialup', km: 20 },
    { at: 'bng', in: 'internet', owner: 'isp' },
    { link: 'backbone', km: 25 },
  ],
  entry: { internet: 'home' },
  layout: {
    overview: {
      // the computer on the desk; the line runs past the telephone and out of the house
      landscape: {
        nodes: { laptop: [420, 575, 220] },
        links: { 'laptop-internet': { curve: [[530, 575], [900, 455], [1290, 430]], label: [40, 70] } },
      },
      portrait: {
        nodes: { laptop: [300, 1345, 250] },
        links: { 'laptop-internet': { curve: [[420, 1320], [860, 1000], [610, 480]], label: [-150, 30] } },
      },
    },
    internet: {
      landscape: { nodes: { home: [140, 620, 120], exchange: [320, 430, 150, 'above'], bng: [560, 640, 150] } },
      portrait: { nodes: { home: [200, 1470, 130], exchange: [640, 1330, 150], bng: [700, 1060, 150] } },
    },
  },
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Modem', title: 'Modem', level: 'both', lang: 'en' },
  ],
});
