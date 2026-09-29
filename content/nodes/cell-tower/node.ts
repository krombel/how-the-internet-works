import { defineNode } from '$core/define';

export default defineNode({
  kind: 'device',
  role: 'bridge',
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Cell_site', title: 'Cell site', level: 'both', lang: 'en' },
    { url: 'https://en.wikipedia.org/wiki/5G_NR', title: '5G NR', level: 'nerd', lang: 'en' },
  ],
});
