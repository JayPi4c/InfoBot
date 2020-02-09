const express = require('express');
const bodyParser = require('body-parser');

const PORT = 31415;

const app = express();
app.use(bodyParser.urlencoded({
  extended: true
}));

app.post('/', function(req, res) {
  console.log('got Data:')
  let arg1 = req.body.arg1;
  let arg2 = req.body.arg2;
  console.log('arg1: ' + arg1 + ' | arg2: ' + arg2);
  res.send('Thanks from Server');
});

app.listen(PORT, () =>
  console.log(`listening on port ${PORT}`));
