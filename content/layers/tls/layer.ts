import { defineLayer } from '$core/define';

export default defineLayer({
  openAt: ['endpoint'],
  dive: 'tls-lock',
  learnMore: [
    { url: 'https://simple.wikipedia.org/wiki/Transport_Layer_Security', title: 'TLS (Simple English)', level: 'kid', lang: 'en' },
    { url: 'https://en.wikipedia.org/wiki/Transport_Layer_Security', title: 'Transport Layer Security', level: 'both', lang: 'en' },
    { url: 'https://da.wikipedia.org/wiki/Transport_Layer_Security', title: 'Transport Layer Security', level: 'both', lang: 'da' },
    { url: 'https://datatracker.ietf.org/doc/html/rfc8446', title: 'RFC 8446: TLS 1.3', level: 'nerd', lang: 'en' },
  ],
});
