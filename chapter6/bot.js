require('dotenv').config();
const mastodon = require('mastodon-api');
const fs = require('fs');

const M = new mastodon({
  client_key: process.env.CLIENT_KEY,
  client_secret: process.env.CLIENT_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  timeout_ms: 60 * 1000,
  api_url: 'https://mastodon.social/api/v1/'
});

const listener = M.stream('streaming/direct');

listener.on('message', evt => {
  // load config file and check if user is allowed to get data from bot
  let config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  let ids = config.map(elt => {
    return {
      id: elt.user_id,
      acct: elt.user_account
    };
  });
  let content = evt.data.last_status.content;
  //https://stackoverflow.com/a/41756926
  // Rule to remove inline CSS.
  content = content.replace(/<style[^>]*>.*<\/style>/gm, '')
    // Rule to remove all opening, closing and orphan HTML tags.
    .replace(/<[^>]+>/gm, '')
    // Rule to remove leading spaces and repeated CR/LF.
    .replace(/([\r\n]+ +)+/gm, '');
  console.log(content);

  let userID = evt.data.last_status.account.id;
  let userName = evt.data.last_status.account.username;
  let account = evt.data.last_status.account.acct;
  let valid = ids.reduce((current, elt) =>
    (elt.id == userID && elt.acct == account), false);

  if (valid) {

    // generating Image



    replyMedia(account, evt.data.last_status.id)
      .then(response => console.log(response))
      .catch(error => console.error(error));

  }
  //fs.writeFileSync('./data.json', JSON.stringify(evt));
  //console.log(evt)
});


listener.on('error', err => console.log(err));

console.log('Bot started');



async function replyMedia(acct, reply_id) {
  //upload replyMedia
  const stream = fs.createReadStream('./out.png');
  const mediaParams = {
    file: stream,
    description: 'A wonderful chart.'
  };
  const response = await M.post('media', mediaParams);
  const mediaID = response.data.id;

  // send reply
  const replyParams = {
    status: `@${acct} a chart!`,
    in_reply_to_id: reply_id,
    media_ids: [mediaID],
    visibility: 'direct'
  }
  const replyReponse = await M.post('statuses', replyParams);

  return {
    success: true
  };
}
