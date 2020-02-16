require('dotenv').config();
const mastodon = require('mastodon-api');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const {
  CanvasRenderService
} = require('chartjs-node-canvas');

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

  let userID = evt.data.last_status.account.id;
  let userName = evt.data.last_status.account.username;
  let account = evt.data.last_status.account.acct;
  let valid = ids.reduce((current, elt) =>
    (elt.id == userID && elt.acct == account), false);

  if (valid) {

    const db = new sqlite3.Database('../db/database.db', sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        console.error(err.message);
      } else {
        console.log('Connected to the database.');

        let cmd = getCommands(content);

        let beginDate = new Date(cmd.from.year, cmd.from.month - 1, cmd.from.day, cmd.from.hour, cmd.from.min);
        let endDate = new Date(cmd.to.year, cmd.to.month - 1, cmd.to.day, cmd.to.hour, cmd.to.min);


        const sql = `SELECT * FROM sensorData WHERE timestamp > ${Math.floor(beginDate.getTime()/1000)} AND timestamp < ${Math.floor(endDate.getTime()/1000)}`;
        db.all(sql, [], async (err, data) => {
          if (err) console.error(err);
          else {
            console.log(`I got ${data.length} datasamples from database!`);
            await createAndSendMedia(account, evt.data.last_status.id, data, beginDate, endDate)
              .then(response => console.log(`Sending reply success: ${response.success}`))
              .catch(err => console.error(err));
            db.close();
          }
        });
      }
    });

  }
});


listener.on('error', err => console.log(err));

console.log('Bot started');


async function createAndSendMedia(acct, reply_id, data, beginDate, endDate) {
  // create image
  const image = await createImage(data, beginDate, endDate);
  // upload image
  const mediaParams = {
    file: image,
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


async function createImage(data, beginDate, endDate) {

  let humidData = data.map(elt => {
    return {
      t: new Date(elt.timestamp * 1000),
      y: elt.humidity
    };
  });
  humidData = formatDataset(humidData);

  let tempData = data.map(elt => {
    return {
      t: new Date(elt.timestamp * 1000),
      y: elt.temperature
    };
  });
  tempData = formatDataset(tempData);

  let config = {
    // The type of chart we want to create
    type: 'line',

    // The data for our dataset
    data: {
      labels: [],
      datasets: [{
        yAxisID: 'temp',
        label: 'Temperatur',
        backgroundColor: 'rgba(200, 0,0,0.5)',
        borderColor: 'rgb(200, 0 ,0)',
        data: tempData
      }, {
        yAxisID: 'humid',
        label: 'Luftfeuchtigkeit',
        /*backgroundColor: 'rgba(0, 0, 200, 0.5)',*/
        borderColor: 'rgb(0, 0, 200)',
        data: humidData
      }]
    },

    // Configuration options go here
    options: {
      scales: {
        xAxes: [{
          type: 'time',
          ticks: {
            unit: 'day',
            min: beginDate,
            max: endDate
          }
        }],
        yAxes: [{
          id: 'humid',
          type: 'linear',
          position: 'right',
          ticks: {
            suggestedMin: parseInt(humidData.reduce((min, elt) => elt.y == null ? min : elt.y < min ? elt.y : min, humidData[0].y)) - 1,
            suggestedMax: parseInt(humidData.reduce((max, elt) => elt.y == null ? max : elt.y > max ? elt.y : max, humidData[0].y)) + 1
          }
        }, {
          id: 'temp',
          type: 'linear',
          position: 'left',
          ticks: {
            suggestedMin: (tempData.reduce((min, elt) => elt.y == null ? min : elt.y < min ? elt.y : min, tempData[0].y) - 1),
            suggestedMax: (tempData.reduce((max, elt) => elt.y == null ? max : elt.y > max ? elt.y : max, tempData[0].y) + 1)
          }
        }]
      },
      elements: {
        point: {
          radius: 0
        }
      }
    }
  };

  const canvasRenderService = new CanvasRenderService(800, 600);
  return await canvasRenderService.renderToDataURL(config);
}


async function sendHelp(acct, reply_id) {
  console.log('usage must be provided');
}



function getCommands(textString) {
  commands = textString.split(' ');
  commands.shift();
  commands.map(cmd => cmd.toLowerCase());

  let response = {
    from: {
      year: commands[0],
      month: commands[1],
      day: commands[2],
      hour: commands[3],
      min: 0
    },
    to: {
      year: commands[4],
      month: commands[5],
      day: commands[6],
      hour: commands[7],
      min: 0
    }
  };

  return response;
}


function formatDataset(sortedArray) {
  for (let i = sortedArray.length - 1; i > 0; i--) {
    let tStampPrev = sortedArray[i - 1].t.getTime();
    let tStamp = sortedArray[i].t.getTime();
    if ((tStamp - tStampPrev) > 2 * 60 * 1000) {
      sortedArray.splice(i, 0, {
        t: new Date(tStampPrev + 1),
        y: null
      });
    }
  }
  return sortedArray;
}
