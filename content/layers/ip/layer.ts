import { defineLayer } from '$core/define';

export default defineLayer({
  dive: 'ip-post',
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Internet_Protocol', title: 'Internet Protocol', level: 'both', lang: 'en' },
    { url: 'https://da.wikipedia.org/wiki/IP-adresse', title: 'IP-adresse', level: 'both', lang: 'da' },
    { url: 'https://en.wikipedia.org/wiki/Time_to_live', title: 'Time to live', level: 'nerd', lang: 'en' },
  ],
});
