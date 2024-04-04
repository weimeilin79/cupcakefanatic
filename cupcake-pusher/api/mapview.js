const { Kafka } = require("kafkajs");
const Pusher = require("pusher");
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_APP_KEY,
  secret: process.env.PUSHER_APP_SECRET,
  cluster: process.env.PUSHER_APP_CLUSTER,
  useTLS: true
});

module.exports = async (req, res) => {
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

    let inventory = {}; // This needs to be managed externally for persistence
    let storeLocations = {}; // Consider pre-loading or storing this data externally
    // Read the CSV file and store the data in storeLocations
    fs.createReadStream('store_nyc.csv')
    .pipe(csv())
    .on('data', (row) => {
      storeLocations[row.storeid] = { lat: parseFloat(row.lat), lng: parseFloat(row.lng), store: row.storename };
    })
    .on('end', () => {
      console.log('CSV file successfully processed');
    });

    const consumer = redpanda.consumer({ groupId: 'cupcake-group' });
    try {
        await consumer.connect();
        await consumer.subscribe({ topic: 'inv-count', fromBeginning: true });

        
        
          await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
              const messageData = JSON.parse(message.value.toString());
              const location = storeLocations[messageData.store];
              const { store, ...rest } = messageData;
               // Set the 'latest' property to false for all stores
               for (let store in inventory) {
                  inventory[store].latest = false;
              }
        
              // Add the store to the inventory and set its 'latest' property to true
              inventory[messageData.store] = { ...rest, ...location, latest: true };
        
              console.log('Updated inventory:', inventory[messageData.store]);
        
              // Broadcast updated inventory to all connected clients
              wss.clients.forEach(function each(client) {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify(inventory));
                }
              });
            },
          })
        
        res.json({ success: true, message: "Inventory processed" });
    } catch (error) {
        console.error("Error in consumer:", error);
        res.status(500).json({ success: false, message: "Error processing inventory" });
    } finally {
        await consumer.disconnect();
    }
};
