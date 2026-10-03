import { defineScene } from '$core/define';

export default defineScene({
  explains: 'layer',
  learnMore: [
    { url: 'https://simple.wikipedia.org/wiki/Hypertext_Transfer_Protocol', title: 'HTTP (Simple English)', level: 'kid', lang: 'en' },
    { url: 'https://da.wikipedia.org/wiki/HTTP', title: 'HTTP', level: 'both', lang: 'da' },
    { url: 'https://www.rfc-editor.org/rfc/rfc9110', title: 'RFC 9110: HTTP Semantics', level: 'nerd', lang: 'en' },
  ],
});
