const { Kafka } = require("kafkajs");
const fs = require('fs'); // Use fs.promises for async/await support
const path = require('path');

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
    // Print out the parameters to the console
    console.log('Store:', store);
    console.log('Blueberry:', blueberry);
    console.log('Strawberry:', strawberry);
    // Condition to check if store, blueberry, and strawberry are all zero
    if(store === '0' && parseInt(blueberry) === 0 && parseInt(strawberry) === 0)  {
        const inventoryFilePath = '/tmp/inventory.json'; 

        if (fs.existsSync(inventoryFilePath)) {
            fs.writeFile(inventoryFilePath, '')
            .then(() => console.log('File contents have been cleared.'))
            .catch((error) => console.error('Error clearing file contents:', error));
            console.log('File deleted successfully');
        } else {
            console.log('File does not exist, no need to delete');
        }
       
    }else{
        await producer.connect();
        await producer.send({
            topic: 'inv-count',
            messages: [
                { value: JSON.stringify({ store, blueberry, strawberry }) },
            ],
        });
        await producer.disconnect();
    }
    

    res.json({ status: 'success' });
};

