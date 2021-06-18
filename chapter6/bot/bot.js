require('dotenv').config();
const Mastodon = require('mastodon-api');
const fs = require('fs');

console.log("Mastodon Bot starting...");

const M = new Mastodon({
  client_key: process.env.CLIENT_KEY,
  client_secret: process.env.CLIENT_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
  api_url: 'https://mastodon.social/api/v1/', // optional, defaults to https://mastodon.social/api/v1/
})

//toot();
//setInterval(toot, 24 * 60 * 60 * 1000);

const listener = M.stream('streaming/direct')
listener.on('error', err => console.log(err))


listener.on('message', msg => {
  console.log(msg);
});
