const { Kafka } = require("kafkajs");

const redpanda = new Kafka({
  clientId: 'store-app',
  brokers: [process.env.SERVERLESSBROKER],
  ssl: {},
  sasl: {
      mechanism: "scram-sha-256",
      username: process.env.RPUSER,
      password: process.env.RPPWD
  }
});

const producer = redpanda.producer();

module.exports = async (req, res) => {
    const { store, blueberry, strawberry } = req.body;

    await producer.connect();
    await producer.send({
        topic: 'inv-count',
        messages: [
            { value: JSON.stringify({ store, blueberry, strawberry }) },
        ],
    });
    await producer.disconnect();

    res.json({ status: 'success' });
};

