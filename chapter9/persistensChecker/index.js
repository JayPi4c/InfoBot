let mqtt = require('mqtt');
let nodemailer = require('nodemailer');
require('dotenv').config();

//http://www.steves-internet-guide.com/using-node-mqtt-client/

let client = mqtt.connect("mqtt://192.168.0.6", { clientID: "PersistensChecker" });


let transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
        user: process.env.MAIL_FROM_USERNAME,
        pass: process.env.MAIL_PASSWORD
    }
});

let mailOptions = {
    from: process.env.MAIL_FROM_USERNAME,
    to: process.env.MAIL_TO_USERNAME,
    subject: 'Server online',
    text: "The server is now online. You will be informed if something wrong happens. For now enjoy your life!"
};

let errorOptions = {
    from: process.env.MAIL_FROM_USERNAME,
    to: process.env.MAIL_TO_USERNAME,
    subject: 'Server offline',
    text: "The Server is now offline since no value was transmitted"
};

transporter.sendMail(mailOptions, (err, info) => { if (err) console.log(err); else console.log('Email sent: ' + info.response) })

/*
options={
clientId:"mqttjs01",
username:"steve",
password:"password",
clean:true};
*/
let messageArrived = true;

client.on("error",
    (error) => {
        console.log("Could not connect to Broker: " + error);
    })

client.on("connect",
    () => {
        console.log("Connected to Broker");
    });

client.subscribe("bedroom/temperature", { qos: 1 },
    () => {
        console.log("subbed a topic");
    });


client.on("message",
    (topic, message, packet) => {
        console.log("message is: " + message);
        console.log("topic is: " + topic);
        messageArrived = true;
    });

setInterval(() => {
    console.log('checking if message arrived');
    if (!messageArrived) {
        console.log("no message arrived in last 10 minutes");
        client.end();
        transporter.sendMail(errorOptions,
            (err, info) => {
                if (err)
                    console.log(err);
                else
                    console.log('Email sent: ' + info.response);
                process.exit(1);
            });
    } else {
        messageArrived = false;
    }
}, 10 * 60 * 1000);

// client.end(); to terminate connection
