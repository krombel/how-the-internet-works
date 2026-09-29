import { defineScene } from '$core/define';

export default defineScene({
  explains: 'layer',
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/5G', title: '5G', level: 'kid', lang: 'en' },
    { url: 'https://da.wikipedia.org/wiki/5G', title: '5G', level: 'kid', lang: 'da' },
    { url: 'https://en.wikipedia.org/wiki/GPRS_Tunnelling_Protocol', title: 'GPRS Tunnelling Protocol', level: 'nerd', lang: 'en' },
    { url: 'https://portal.3gpp.org/desktopmodules/Specifications/SpecificationDetails.aspx?specificationId=1699', title: '3GPP TS 29.281', level: 'nerd', lang: 'en' },
  ],
});
