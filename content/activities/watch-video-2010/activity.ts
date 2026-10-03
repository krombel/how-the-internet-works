import { defineActivity } from '$core/define';
import watchVideo from '../watch-video/activity';

// "Get something big from far away", in 2010 (#59): a small video, fetched as one file over plain HTTP (video sites
// moved to HTTPS a few years later). The internet in the middle is today's for now, so the route, groups and layout
// are the base's.
const [video] = watchVideo.flows;
export default defineActivity({
  ...watchVideo,
  variantOf: 'watch-video',
  era: '2010',
  flows: [
    {
      ...video,
      stack: ['ip', 'tcp', 'http'],
      // Windows 7 picks its client ports from 49152 up; the video server listens on port 80
      ports: { client: 50112, server: 80 },
      // the same 3 minutes in 360p (YouTube's usual then, about 0.75 Mbit/s)
      packets: [video.packets[0], { ...video.packets[1], size: 17_000_000 }],
    },
  ],
  learnMore: [
    { url: 'https://en.wikipedia.org/wiki/Progressive_download', title: 'Progressive download', level: 'both', lang: 'en' },
  ],
});
