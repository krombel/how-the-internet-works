import { defineLayer } from '$core/define';

// PPP in HDLC-like framing (RFC 1662), the dial-up modem's frame: only the two ends of the call read it; the
// telephone exchange in between just carries the sound.
export default defineLayer({
  fields: [
    { id: 'flag', bits: 8, value: '0x7E' },
    { id: 'address', bits: 8, value: '0xFF' },
    { id: 'control', bits: 8, value: '0x03' },
    { id: 'proto', bits: 16, value: '{inner.ppp}', use: ['router', 'endpoint'], kid: '@ip' },
    // a 32-bit frame check, as the modems agreed (LCP) when the call began
    { id: 'fcs', bits: 32, value: '{crc}', use: ['router', 'endpoint'] },
  ],
  openAt: ['endpoint', 'router'],
  dive: 'ppp-hello',
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Point-to-Point_Protocol', title: 'Point-to-Point Protocol', level: 'nerd', lang: 'en' },
  ],
});
