let express = require('express');
let cors = require('cors');
let bodyParser = require('body-parser');

let app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

app.post('/', (req, res)=>{
  console.log(req.body);
  res.send('Answer from server');
});

app.listen(3000, ()=>{
  console.log('Webhook listening on port 3000!');
})
