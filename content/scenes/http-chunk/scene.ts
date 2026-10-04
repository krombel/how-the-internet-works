import { defineScene } from '$core/define';

export default defineScene({
  explains: 'layer',
  learnMore: [
    { url: 'https://simple.wikipedia.org/wiki/Hypertext_Transfer_Protocol', title: 'HTTP (Simple English)', level: 'kid', lang: 'en' },
    { url: 'https://da.wikipedia.org/wiki/HTTP', title: 'HTTP', level: 'both', lang: 'da' },
    { url: 'https://www.rfc-editor.org/rfc/rfc9110', title: 'RFC 9110: HTTP Semantics', level: 'nerd', lang: 'en', eras: ['today'] },
    { url: 'https://www.rfc-editor.org/rfc/rfc2616', title: 'RFC 2616: HTTP/1.1', level: 'nerd', lang: 'en', eras: ['2010'] },
    { url: 'https://www.rfc-editor.org/rfc/rfc1945', title: 'RFC 1945: HTTP/1.0 (1996)', level: 'nerd', lang: 'en', eras: ['1995'] },
  ],
});
