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
console.log(`Got a new request @ ${new Date().toString()}`);

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
    console.log('User is valid => proceeding');
    const db = new sqlite3.Database('../db/database.db', sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        console.error(err.message);
      } else {
        console.log('Connected to the database.');

        let cmd = parseCommand(content);

        let beginDate = new Date(cmd.from.year, cmd.from.month, cmd.from.day, cmd.from.hour, cmd.from.minute, cmd.from.second, cmd.from.millisecond);
        let endDate = new Date(cmd.to.year, cmd.to.month, cmd.to.day, cmd.to.hour, cmd.to.minute, cmd.to.second, cmd.to.millisecond);


        const sql = `SELECT * FROM sensorData WHERE timestamp > ${Math.floor(beginDate.getTime()/1000)} AND timestamp < ${Math.floor(endDate.getTime()/1000)}`;
        db.all(sql, [], async (err, data) => {
          if (err) console.error(err);
          else {
            console.log(`I got ${data.length} datasamples from database!`);
            if (data.length == 0) return;
            await createAndSendMedia(account, evt.data.last_status.id, data, cmd)
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


async function createAndSendMedia(acct, reply_id, data, cmd) {
  let beginDate = new Date(cmd.from.year, cmd.from.month, cmd.from.day, cmd.from.hour, cmd.from.minute, cmd.from.second, cmd.from.millisecond);
  let endDate = new Date(cmd.to.year, cmd.to.month, cmd.to.day, cmd.to.hour, cmd.to.minute, cmd.to.second, cmd.to.millisecond);
  // create image
  const image = await createImage(data, cmd, beginDate, endDate);
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


async function createImage(data, cmd, beginDate, endDate) {
  let config = {};
  config.type = cmd.type;
  config.data = {
    labels: [],
    datasets: []
  };

  config.options = {
    scales: {
      xAxes: [{
        type: 'time',
        ticks: {
          unit: 'day',
          min: beginDate,
          max: endDate
        }
      }],
      yAxes: []
    },
    elements: {
      point: {
        radius: 0
      }
    }
  };

  if (cmd.value.humidity) {

    let humidData = data.map(elt => {
      return {
        t: new Date(elt.timestamp * 1000),
        y: elt.humidity
      };
    });
    humidData = formatDataset(humidData);

    config.data.datasets.push({
      yAxisID: 'humid',
      label: 'Luftfeuchtigkeit',
      /*backgroundColor: 'rgba(0, 0, 200, 0.5)',*/
      borderColor: 'rgb(0, 0, 200)',
      data: humidData
    });
    config.options.scales.yAxes.push({
      id: 'humid',
      type: 'linear',
      position: 'right',
      ticks: {
        suggestedMin: parseInt(humidData.reduce((min, elt) => elt.y == null ? min : elt.y < min ? elt.y : min, humidData[0].y)) - 1,
        suggestedMax: parseInt(humidData.reduce((max, elt) => elt.y == null ? max : elt.y > max ? elt.y : max, humidData[0].y)) + 1
      }
    });
  }

  if (cmd.value.temperature) {
    let tempData = data.map(elt => {
      return {
        t: new Date(elt.timestamp * 1000),
        y: elt.temperature
      };
    });
    tempData = formatDataset(tempData);
    config.data.datasets.push({
      yAxisID: 'temp',
      label: 'Temperatur',
      backgroundColor: 'rgba(200, 0,0,0.5)',
      borderColor: 'rgb(200, 0 ,0)',
      data: tempData
    });
    config.options.scales.yAxes.push({
      id: 'temp',
      type: 'linear',
      position: 'left',
      ticks: {
        suggestedMin: (tempData.reduce((min, elt) => elt.y == null ? min : elt.y < min ? elt.y : min, tempData[0].y) - 1),
        suggestedMax: (tempData.reduce((max, elt) => elt.y == null ? max : elt.y > max ? elt.y : max, tempData[0].y) + 1)
      }
    });
  }

  const canvasRenderService = new CanvasRenderService(800, 600);
  return await canvasRenderService.renderToDataURL(config);
}


async function sendHelp(acct, reply_id) {
  console.log('usage must be provided');
}

function parseCommand(msg) {
  let parts = msg.split('-');
  parts.shift();

  let now = new Date();
  let yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));

  let answer = {
    type: 'line',
    from: {
      year: yesterday.getFullYear(),
      month: yesterday.getMonth(),
      day: yesterday.getDate(),
      hour: yesterday.getHours(),
      minute: yesterday.getMinutes(),
      second: yesterday.getSeconds(),
      millisecond: yesterday.getMilliseconds()
    },
    to: {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
      second: now.getSeconds(),
      millisecond: now.getMilliseconds()
    },
    value: {
      humidity: false,
      temperature: false
    }
  };



  let fromTimeEdited = false;
  let toTimeEdited = false;
  let valueEdited = false;

  for (let i = 0; i < parts.length; i++) {
    let temp = parts[i].split(' ');
    switch (temp[0].toLowerCase()) {
      case 'type':
        answer.type = temp[1];
        break;
      case 'from':
        fromTimeEdited = true;
        for (let j = 1; j < temp.length; j++) {
          switch (j) {
            case 1:
              answer.from.year = temp[j];
              break;
            case 2:
              answer.from.month = temp[j] - 1;
              break;
            case 3:
              answer.from.day = temp[j];
              break;
            case 4:
              answer.from.hour = temp[j];
              break;
            case 5:
              answer.from.minute = temp[j];
              break;
            case 6:
              answer.from.second = temp[j];
              break;
            case 7:
              answer.from.millisecond = temp[j];
              break;
          }
        }
        for (let j = temp.length; j <= 7; j++) {
          switch (j) {
            case 2:
              answer.from.month = 0;
              break;
            case 3:
              answer.from.day = 1;
              break;
            case 4:
              answer.from.hour = 0;
              break;
            case 5:
              answer.from.minute = 0;
              break;
            case 6:
              answer.from.second = 0;
              break;
            case 7:
              answer.from.millisecond = 0;
              break;
          }
        }

        break;
      case 'to':
        toTimeEdited = true;
        for (let j = 1; j < temp.length; j++) {
          switch (j) {
            case 1:
              answer.to.year = temp[j];
              break;
            case 2:
              answer.to.month = temp[j] - 1;
              break;
            case 3:
              answer.to.day = temp[j];
              break;
            case 4:
              answer.to.hour = temp[j];
              break;
            case 5:
              answer.to.minute = temp[j];
              break;
            case 6:
              answer.to.second = temp[j];
              break;
            case 7:
              answer.to.millisecond = temp[j];
              break;
          }
        }
        for (let j = temp.length; j <= 7; j++) {
          switch (j) {
            case 2:
              answer.to.month = 0;
              break;
            case 3:
              answer.to.day = 1;
              break;
            case 4:
              answer.to.hour = 0;
              break;
            case 5:
              answer.to.minute = 0;
              break;
            case 6:
              answer.to.second = 0;
              break;
            case 7:
              answer.to.millisecond = 0;
              break;
          }
        }

        break;
      case 'value':
        valueEdited = true;
        for (let j = 1; j < temp.length; j++) {
          switch (temp[j].toLowerCase()) {
            case 'humid':
            case 'humidity':
              answer.value.humidity = true;
              break;
            case 'temp':
            case 'temperature':
              answer.value.temperature = true;
              break;
          }
        }
    }
  }

  if (!valueEdited) {
    answer.value.temperature = true;
    answer.value.humidity = true;
  }

  if (fromTimeEdited && !toTimeEdited) {
    let date = new Date(answer.from.year, answer.from.month, answer.from.day, answer.from.hour, answer.from.minute, answer.from.second, answer.from.millisecond);
    let target = new Date(date.getTime() + (24 * 60 * 60 * 1000));
    answer.to.year = target.getFullYear();
    answer.to.month = target.getMonth();
    answer.to.day = target.getDate();
    answer.to.hour = target.getHours();
    answer.to.minute = target.getMinutes();
    answer.to.second = target.getSeconds();
    answer.to.millisecond = target.getMilliseconds();
  }

  if (!fromTimeEdited && toTimeEdited) {
    let date = new Date(answer.to.year, answer.to.month, answer.to.day, answer.to.hour, answer.to.minute, answer.to.second, answer.to.millisecond);
    let target = new Date(date.getTime() - (24 * 60 * 60 * 1000));
    answer.from.year = target.getFullYear();
    answer.from.month = target.getMonth();
    answer.from.day = target.getDate();
    answer.from.hour = target.getHours();
    answer.from.minute = target.getMinutes();
    answer.from.second = target.getSeconds();
    answer.from.millisecond = target.getMilliseconds();
  }
  return answer;
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
