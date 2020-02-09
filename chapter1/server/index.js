const express = require('express');
const bodyParser = require('body-parser');

const PORT = 31415;

const app = express();
app.use(bodyParser.urlencoded({
  extended: true
}));

app.post('/', function(req, res) {
  console.log('got Data:')
  let temp = req.body.temp;
  let humid = req.body.humid;
  let time = req.body.time;
  console.log('temp: ' + temp + ' | humid: ' + humid + ' @ ' + time);
  res.send('Thanks from Server');
});

app.listen(PORT, () =>
  console.log(`listening on port ${PORT}`));
