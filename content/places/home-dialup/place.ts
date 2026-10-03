import { definePlace } from '$core/define';

// At home in the 1990s, on dial-up: no Wi-Fi and no router. The computer's own modem phones the internet company,
// the telephone exchange connects the call, and the ISP's modem bank answers and hands the computer an address (PPP).
export default definePlace({
  variantOf: 'home',
  order: 1.6,
  era: '1995',
  hops: [
    { at: 'pc', addr: '203.0.113.7' },
    { link: 'dialup', km: 2.5 },
    { at: 'exchange', in: 'internet' },
    // the exchange hands the call to the ISP in a timeslot of an ISDN line (PRI), to its rack of modems
    { link: 'pri', km: 20 },
    { at: 'bng', node: 'modem-bank', in: 'internet', owner: 'isp' },
    // a 10 Mbit/s Ethernet cable in the same rack, to the ISP's one router (10BASE-T)
    { link: 'ethernet', km: 0.005, rate: { down: 10e6, up: 10e6 } },
  ],
  entry: { internet: 'home' },
  layout: {
    overview: {
      // the computer on the desk; the line runs past the telephone and out of the house. The era's props: a calendar
      // on the wall, a mouse on the desk, the modem on a shelf between the desk and the telephone
      landscape: {
        nodes: { pc: [400, 575, 220] },
        links: { 'pc-internet': { curve: [[510, 575], [900, 455], [1290, 430]], label: [40, 70] } },
        props: { wall: [215, 545, 90, 100], desk: [502, 644, 48, 24], modem: [640, 600, 80, 52] },
      },
      portrait: {
        nodes: { pc: [280, 1345, 250] },
        links: { 'pc-internet': { curve: [[400, 1320], [860, 1000], [610, 480]], label: [-150, 30] } },
        props: { wall: [760, 1222, 76, 96], desk: [418, 1404, 52, 24], modem: [600, 1290, 84, 54] },
      },
    },
    internet: {
      landscape: { nodes: { home: [140, 620, 120], exchange: [250, 385, 150, 'above'], bng: [565, 585, 150, 'above'] }, links: { 'bng-core': { bend: 0.6 } } },
      portrait: { nodes: { home: [200, 1470, 130], exchange: [610, 1380, 150], bng: [720, 1060, 150] }, links: { 'bng-core': { bend: 0.08 } } },
    },
  },
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Modem', title: 'Modem', level: 'both', lang: 'en' },
  ],
});
