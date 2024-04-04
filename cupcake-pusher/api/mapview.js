const { Kafka } = require("kafkajs");
const Pusher = require("pusher");
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');





module.exports = async (req, res) => {
    const channelId = req.query.channelId || 'unknown_channel';
    console.log('channelId:', channelId);

    const pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUHSER_APP_KEY,
      secret: process.env.PUHSER_APP_SECRET,
      cluster: process.env.PUHSER_APP_CLUSTER,
      useTLS: true
    });
  

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
    
    let inventory = {};
    const inventoryFilePath = path.join(__dirname, '..', 'tmp', 'inventory.json');
    try {
      const inventoryData = await fs.promises.readFile(inventoryFilePath, 'utf8');
      inventory = JSON.parse(inventoryData);
    } catch (error) {
      console.warn('No existing inventory file found, starting with empty inventory.');
    }

    let storeLocations = {}; // Consider pre-loading or storing this data externally
    
    const filePath = path.join(__dirname, '..', 'data', 'store_nyc.csv');

    fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      storeLocations[row.storeid] = { lat: parseFloat(row.lat), lng: parseFloat(row.lng), store: row.storename };
    })
    .on('end', () => {
      console.log('CSV file successfully processed');
    });

    const consumer = redpanda.consumer({ groupId: 'cupcake_group_'+channelId });
    const MAX_BLOCK_TIME = 5000;

    try {
        
        await consumer.connect();
        await consumer.subscribe({ topic: 'inv-count' });
       
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
      
            try {
              pusher.trigger("my-channel", channelId , JSON.stringify(inventory));
            } catch (error) {
              console.error('Error:', error);
            }
          },
        });
        
        //For Demo purposes only, we will wait for a few seconds before disconnecting
        //Normally, the consumer will run indefinitely, since vercel doesn't allow it, we disconnect after MAX_BLOCK_TIME
        await new Promise(resolve => setTimeout(resolve, MAX_BLOCK_TIME) );
       
        
        try {
          const inventoryFilePath = '/tmp/inventory.json'; 
          await updateInventoryFile(inventoryFilePath, inventory);

          await fs.mkdir(path.dirname(inventoryFilePath), { recursive: true });
          await fs.writeFile(inventoryFilePath, JSON.stringify(inventory));
          console.log('Inventory saved.');
        } catch (error) {
            console.error('Error saving inventory:', error);
        }


        res.json({ success: true, message: "Inventory processed" }
        );
    } catch (error) {
        console.error("Error in consumer:", error);
        res.status(500).json({ success: false, message: "Error processing inventory" });
    } finally {
        console.log('Disconnected...');
        await consumer.disconnect();
    }
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}