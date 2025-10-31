// scripts/subscribe.ts
import axios from 'axios';

const HUB = 'https://pubsubhubbub.appspot.com/subscribe';
const CALLBACK = `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook`;
const TOPIC = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${process.env.CHANNEL_ID}`;

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