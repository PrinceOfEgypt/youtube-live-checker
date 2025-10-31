// scripts/subscribe.ts
import axios from 'axios';

const HUB = 'https://pubsubhubbub.appspot.com/subscribe';
const CALLBACK = `https://youtube-live-checker.michael-abdelmalek.workers.dev/api/webhook`;
const TOPIC = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=UCw3BCSojo1NKBw0xvfKa4ZQ`;

async function subscribe() {
  await axios.post(HUB, null, {
    params: {
      'hub.mode': 'subscribe',
      'hub.topic': TOPIC,
      'hub.callback': CALLBACK,
    },
  });
  console.log('Subscribed!');
}

subscribe();