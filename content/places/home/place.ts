import { definePlace } from '$core/define';

// At home: the phone on Wi-Fi, a cable to the home router, and fibre to the home (FTTH) up the street.
export default definePlace({
  order: 1,
  hops: [
    { at: 'phone', addr: '192.168.1.23' },
    { link: 'wifi' },
    { at: 'ap' },
    { link: 'ethernet' },
    { at: 'router', addr: '192.168.1.1', natTo: '203.0.113.7' },
    { link: 'gpon' },
    { at: 'cabinet', in: 'internet' },
    { link: 'metro-fibre', stack: ['ethernet', 'vlan'] },
    { at: 'backhaul', in: 'internet' },
    { link: 'metro-fibre', stack: ['ethernet', 'vlan'] },
    { at: 'bng', in: 'internet' },
    { link: 'backbone' },
  ],
  // inside the internet, the whole house stands for "where you came from"
  entry: { internet: 'home' },
  layout: {
    overview: {
      landscape: {
        nodes: { phone: [230, 560, 210], ap: [640, 380, 190, 'above'], router: [1010, 580, 200] },
        links: {
          // hand-drawn curves
          'phone-ap': { curve: [[300, 500], [420, 360], [580, 400]], label: [-10, -58] },
          'ap-router': { curve: [[690, 450], [790, 640], [920, 590]], label: [0, 62] },
          'router-internet': { curve: [[1100, 570], [1250, 580], [1290, 430]], label: [40, 70] },
        },
      },
      portrait: {
        nodes: { phone: [250, 1330, 250], ap: [650, 1030, 220], router: [260, 720, 230] },
        links: {
          'phone-ap': { bend: 0.16, label: [-30, -64] },
          'ap-router': { bend: 0.16, label: [-44, 56] },
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
    { url: 'https://en.wikipedia.org/wiki/Fiber_to_the_x', title: 'Fibre to the home', level: 'nerd', lang: 'en' },
  ],
});
