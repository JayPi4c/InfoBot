const  bot  = require('bot-commander');
const sqlite3 = require('sqlite3').verbose();



bot.command('chart')
.option('-t, --type <type>', 'Specify the type of chart. Valid options are \"line\"|...')
.option('--fYear <number>', 'specifiy <year> <month> <day> <hour> <minute> <second>')
.option('--fMonth <number>', 'specifiy <year> <month> <day> <hour> <minute> <second>')
.action((meta, opts) =>{
  console.log(meta);
  console.log(opts);
});

bot.command('update')
.option('--year <number>', 'current if not specified')
.option('--month <number>', 'current if not specified')
.option('--day <number>', 'current if not specified')
.option('--hour <number>', 'current if not specified')
.option('--minute <number>', 'current if not specified')
.action((meta, opts)=>{
  console.log(opts);
});


bot.parse('chart -t line --fYear 2020');
bot.parse('update');



  const db = new sqlite3.Database('./database.db', sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log('Connected to the database.');

let ts = 1606308787; // calculate the timestamp according to the input


      //const sql = `SELECT * FROM sensorData WHERE timestamp > ${Math.floor(beginDate.getTime()/1000)} AND timestamp < ${Math.floor(endDate.getTime()/1000)}`;
const sql = `SELECT * FROM sensorData ORDER BY ABS(timestamp - ${ts}) ASC LIMIT 1`;
      db.all(sql, [], async (err, data) => {
        if (err) console.error(err);
        else {
          console.log(`I got ${data.length} datasamples from database!`);
          console.log(data);


        }
          db.close();
      });
    }
  });
