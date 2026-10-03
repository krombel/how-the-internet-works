import { defineNode } from '$core/define';

// A GSM mobile switching centre (MSC) of the 1990s: the mobile network's telephone exchange. For a data call its
// interworking function (IWF), a rack of modems, ends the radio link protocol and calls on as an ordinary modem.
export default defineNode({
  kind: 'device',
  role: 'bridge',
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Mobile_switching_centre_server', title: 'Mobile switching centre', level: 'both', lang: 'en' },
    { url: 'https://www.3gpp.org/DynaReport/29007.htm', title: '3GPP TS 29.007 (the IWF)', level: 'nerd', lang: 'en' },
  ],
});
