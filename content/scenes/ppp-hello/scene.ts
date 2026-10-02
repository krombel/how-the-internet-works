import { defineScene } from '$core/define';

export default defineScene({
  explains: 'layer',
  learnMore: [
    { url: 'https://simple.wikipedia.org/wiki/Point-to-Point_Protocol', title: 'Point-to-Point Protocol', level: 'kid', lang: 'en' },
    { url: 'https://www.rfc-editor.org/rfc/rfc1661', title: 'RFC 1661: PPP', level: 'nerd', lang: 'en' },
    { url: 'https://www.rfc-editor.org/rfc/rfc1662', title: 'RFC 1662: PPP in HDLC-like framing', level: 'nerd', lang: 'en' },
    { url: 'https://da.wikipedia.org/wiki/Point-to-Point_Protocol', title: 'Point-to-Point Protocol', level: 'both', lang: 'da' },
  ],
});
