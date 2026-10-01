import { definePlace } from '$core/define';

// At home: the phone on Wi-Fi, a cable to the home router, and fibre to the home (FTTH) up the street.
export default definePlace({
  order: 1,
  hops: [
    { at: 'phone', addr: '192.168.1.23' },
    { link: 'wifi', km: 0.005 },
    { at: 'ap' },
    { link: 'ethernet', km: 0.005 },
    { at: 'router', addr: '192.168.1.1', natTo: '203.0.113.7:61757' },
    { link: 'gpon', km: 1.2 },
    { at: 'cabinet', in: 'internet', owner: 'isp' },
    { link: 'metro-fibre', stack: ['ethernet', 'vlan'], km: 6 },
    { at: 'backhaul', in: 'internet', owner: 'isp' },
    { link: 'metro-fibre', stack: ['ethernet', 'vlan'], km: 18 },
    { at: 'bng', in: 'internet', owner: 'isp' },
    { link: 'backbone', km: 25 },
  ],
  // inside the internet, the whole house stands for "where you came from"
  entry: { internet: 'home' },
  layout: {
    overview: {
      landscape: {
        // everything indoors: the Wi-Fi box on the wall, so the radio hop crosses the room and not the roof
        nodes: { phone: [230, 590, 210], ap: [590, 560, 180, 'above'], router: [1015, 600, 190] },
        links: {
          'phone-ap': { bend: -0.15, label: [0, 90] },
          'ap-router': { bend: 0.18, label: [0, -50] },
          'router-internet': { curve: [[1090, 590], [1250, 600], [1290, 430]], label: [40, 70] },
        },
      },
      portrait: {
        // the Wi-Fi box and the phone downstairs, the router up in the attic, the fibre out through the roof
        nodes: { phone: [220, 1400, 210], ap: [650, 1150, 170], router: [464, 885, 180, 'above'] },
        links: {
          'phone-ap': { bend: -0.2, label: [5, -50] },
          'ap-router': { bend: 0.2, label: [200, 0] },
          'router-internet': { curve: [[550, 880], [740, 700], [610, 480]], label: [100, -60] },
        },
      },
    },
    internet: {
      landscape: { nodes: { home: [140, 680, 120], cabinet: [295, 450, 150, 'above'], backhaul: [450, 680, 150], bng: [640, 450, 150, 'above'] } },
      portrait: { nodes: { home: [200, 1470, 130], cabinet: [640, 1330, 150], backhaul: [240, 1180, 150], bng: [650, 1030, 150] } },
    },
  },
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Fiber_to_the_x', title: 'Fibre to the home', level: 'nerd', lang: 'en' },
  ],
});
