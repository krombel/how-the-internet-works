import { defineLayer } from '$core/define';

export default defineLayer({
  code: { ethertype: '0x8847 (MPLS)' },
  fields: [
    { id: 'label', bits: 20, value: { up: '24012', down: '17003' }, use: true, kid: true },
    { id: 'tc', bits: 3, value: '0' },
    { id: 's', bits: 1, value: '1 (bottom of stack)' },
    { id: 'ttl', bits: 8, value: '{ttl}', use: true },
  ],
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Multiprotocol_Label_Switching', title: 'MPLS', level: 'nerd', lang: 'en' },
  ],
});
