import { definePlace } from '$core/define';
import home from '../home/place';

// At home on the phone line (xDSL), around 2010: the same house, Wi-Fi and cable, but you're on a laptop (the start
// device of 2010, #59), and the router has a modem that sends tones down the copper phone pair to a DSLAM in the street
// cabinet. From there it's fibre, as with fibre to the home.
export default definePlace({
  variantOf: 'home',
  order: 1.4,
  era: '2010',
  hops: [
    { at: 'laptop', addr: '192.168.1.23' },
    { link: 'wifi', km: 0.005 },
    { at: 'ap' },
    { link: 'ethernet', km: 0.005 },
    { at: 'router', node: 'dsl-router', addr: '192.168.1.1', natTo: '203.0.113.7:61757' },
    { link: 'vdsl', km: 0.4 },
    { at: 'cabinet', node: 'dslam', in: 'internet', owner: 'isp' },
    { link: 'metro-fibre', stack: ['ethernet', 'vlan'], km: 6 },
    { at: 'backhaul', in: 'internet', owner: 'isp' },
    { link: 'metro-fibre', stack: ['ethernet', 'vlan'], km: 18 },
    { at: 'bng', in: 'internet', owner: 'isp' },
    { link: 'backbone', km: 25 },
  ],
  entry: { internet: 'home' },
  // laid out as at home (the same house, the same rooms), the laptop where the phone would be
  layout: {
    overview: {
      landscape: {
        nodes: { laptop: [230, 590, 210], ap: [590, 560, 180, 'above'], router: [1015, 600, 190] },
        links: {
          'laptop-ap': { bend: -0.15, label: [0, 90] },
          'ap-router': { bend: 0.18, label: [0, -50] },
          'router-internet': { curve: [[1090, 590], [1250, 600], [1290, 430]], label: [40, 70] },
        },
      },
      portrait: {
        nodes: { laptop: [220, 1400, 210], ap: [650, 1150, 170], router: [464, 885, 180, 'above'] },
        links: {
          'laptop-ap': { bend: -0.2, label: [5, -50] },
          'ap-router': { bend: 0.2, label: [200, 0] },
          'router-internet': { curve: [[550, 880], [740, 700], [610, 480]], label: [100, -60] },
        },
      },
    },
    internet: home.layout!.internet,
  },
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Digital_subscriber_line', title: 'DSL', level: 'both', lang: 'en' },
    { url: 'https://da.wikipedia.org/wiki/DSL', title: 'DSL', level: 'both', lang: 'da' },
  ],
});
