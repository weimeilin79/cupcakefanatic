const express = require('express');
const {Kafka} = require("kafkajs")

require('./mapview.js');

const app = express();

const redpanda = new Kafka({
  clientId: 'store-app',
  brokers: ["co258dppom78tp54qp20.any.us-east-1.mpx.prd.cloud.redpanda.com:9092"],
  ssl: {},
  sasl: {
      mechanism: "scram-sha-256",
      username: "admin",
      password: "1234qwer"
  }
})

const producer = redpanda.producer()

app.use(express.json());

app.post('/submit', async function(req, res) {
  const { store, blueberry, strawberry } = req.body;
  console.log('Sending message:', { store, blueberry, strawberry });
  
  await producer.connect();
  await producer.send({
      topic: 'inv-count',
      messages: [
          { value: JSON.stringify({ store, blueberry, strawberry }) },
      ],
  });
  await producer.disconnect();

  res.json({ status: 'success' });
});

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.get('/input', function(req, res) {
  res.sendFile(__dirname + '/input.html');
});

app.get('/input.js', function(req, res) {
  res.sendFile(__dirname + '/input.js');
});

app.listen(3000, function() {
  console.log('App listening on port 3000!');
});