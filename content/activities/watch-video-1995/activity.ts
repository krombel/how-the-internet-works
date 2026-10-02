import { defineActivity } from '$core/define';
import watchVideo from '../watch-video/activity';

// "Get something big from far away", in 1995 (#59): a web page with a picture, not a video. Plain HTTP over TCP: SSL
// had just come out for shops, and video was barely possible on a modem. The internet in the middle is today's for
// now, so the route, groups and layout are the base's.
const [video] = watchVideo.flows;
export default defineActivity({
  ...watchVideo,
  variantOf: 'watch-video',
  era: '1995',
  flows: [
    {
      id: 'page',
      stack: ['ip', 'tcp', 'http'],
      // Windows 95 picked its client ports from 1025 to 5000; the web server listens on port 80
      ports: { client: 1031, server: 80 },
      packets: [video.packets[0], { ...video.packets[1], kind: 'page' }],
    },
  ],
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Web_page', title: 'Web page', level: 'both', lang: 'en' },
    { url: 'https://www.rfc-editor.org/rfc/rfc1945', title: 'RFC 1945: HTTP/1.0', level: 'nerd', lang: 'en' },
  ],
});
