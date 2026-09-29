import { defineNode } from '$core/define';

export default defineNode({
  kind: 'device',
  role: 'router',
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Multiprotocol_Label_Switching', title: 'MPLS', level: 'nerd', lang: 'en' },
  ],
});
