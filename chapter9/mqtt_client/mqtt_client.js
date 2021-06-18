require('dotenv').config();
let mqtt = require('mqtt');
const sqlite3 = require('sqlite3').verbose();

let bedroom_topic = "bedroom";


let client = mqtt.connect(process.env.BROKER_URL, { clientID: process.env.CLIENT_ID })

client.on("error",
    (error) => {
        console.log(`Could not connect to Broker: ${error}`);
    });

client.on("connect",
    () => {
        console.log(`Connected to Broker.`);
    });

client.subscribe(bedroom_topic, { qos: 1 },
    () => {
        console.log(`Subbed topic "${bedroom_topic}".`);
    });



client.on("message",
    (topic, message, packet) => {
        const content = JSON.parse(message);
        let data = [content.timestamp, content.temperature, content.humidity];
        saveInLocalDatabase(data);
    });


function saveInLocalDatabase(data) {
    let db = new sqlite3.Database('../db/database.db', sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error(err.message);
        }
    });

    let sql = 'INSERT INTO sensorData (timestamp, temperature, humidity) VALUES (?, ?, ?)';
    // overwrite timestampvalue to current servertime
    // "~~" removes all decimal places after the decimal point and therefore making the number an integer
    data[0] = ~~(new Date().getTime() / 1000);

    db.run(sql, data, err => {
        if (err) {
            return console.log(err.message);
        }
        console.log(`Locally saved @ ${new Date(data[0] * 1000).toString()} temp: ${data[1]} | humid: ${data[2]}.`);
    });

    db.close();
}