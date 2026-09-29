import { defineScene } from '$core/define';

export default defineScene({
  explains: 'layer',
  learnMore: [
    { url: 'https://simple.wikipedia.org/wiki/Transmission_Control_Protocol', title: 'TCP (Simple English)', level: 'kid', lang: 'en' },
    { url: 'https://da.wikipedia.org/wiki/Transmission_Control_Protocol', title: 'Transmission Control Protocol', level: 'both', lang: 'da' },
    { url: 'https://en.wikipedia.org/wiki/Transmission_Control_Protocol', title: 'Transmission Control Protocol', level: 'both', lang: 'en' },
    { url: 'https://www.rfc-editor.org/rfc/rfc9293', title: 'RFC 9293: TCP', level: 'nerd', lang: 'en' },
  ],
});
