import { definePlace } from '$core/define';
import home from '../home/place';

// At home on the phone line (xDSL): the same house, Wi-Fi and cable, but the router has a modem that sends tones down
// the copper phone pair to a DSLAM in the street cabinet. From there it's fibre, as with fibre to the home.
export default definePlace({
  variantOf: 'home',
  order: 1.4,
  era: '2010',
  hops: [
    { at: 'phone', addr: '192.168.1.23' },
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
  // laid out as at home: the same house, the same rooms
  layout: home.layout,
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Digital_subscriber_line', title: 'DSL', level: 'both', lang: 'en' },
    { url: 'https://da.wikipedia.org/wiki/DSL', title: 'DSL', level: 'both', lang: 'da' },
  ],
});
