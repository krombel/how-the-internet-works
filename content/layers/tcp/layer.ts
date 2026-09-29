import { defineLayer } from '$core/define';

export default defineLayer({
  openAt: ['endpoint'],
  dive: 'tcp-pieces',
  learnMore: [
    { url: 'https://simple.wikipedia.org/wiki/Transmission_Control_Protocol', title: 'TCP (Simple English)', level: 'kid', lang: 'en' },
    { url: 'https://da.wikipedia.org/wiki/Transmission_Control_Protocol', title: 'Transmission Control Protocol', level: 'both', lang: 'da' },
    { url: 'https://en.wikipedia.org/wiki/Transmission_Control_Protocol', title: 'TCP', level: 'nerd', lang: 'en' },
  ],
});
