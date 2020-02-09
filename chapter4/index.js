require('dotenv').config();
const https = require('https');

const URL_PRE = `https://docs.google.com/spreadsheets/u/0/d/${process.env.SPREADSHEET_ID}/gviz/tq?tqx=out:csv&pli=1&tq=SELECT+A,+B,+C+WHERE+`;
const URL_MID = '+%3C+A+and+A+%3C+';


function getData(target) {

  let address = URL_PRE + (target - 600) + URL_MID + target;

  https.get(address, (resp) => {
    let data = '';

    resp.on('data', (chunk) => {
      data += chunk;
    });

    resp.on('end', () => {
      let result = data.split('\n').splice(1).map(v => v.split(',')).map(v => v.map(v_ => v_.replace(/['"]+/g, '')));
      // instead of just printing the result we need to create a chart out of it and send it via twitter.

      console.log(result);
    });
  }).on('error', (err) => {
    console.err('ERROR: ' + err.message);
  });

}

//getData(Math.floor(new Date().getTime()/1000+12*60*60));
getData(Math.floor(new Date().getTime() / 1000));
