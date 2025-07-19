const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const app = express();
const PORT = 3000;

// Firebase Admin Initialization
const serviceAccount = require('./firebase-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://esp32-iot-842e3-default-rtdb.asia-southeast1.firebasedatabase.app/"
});

const db = admin.database();

app.use(bodyParser.json());

// API Endpoint to receive data from ESP32
app.post('/lora', (req, res) => {
  const { data, rssi } = req.body;

  if (!data || typeof rssi === 'undefined') {
    return res.status(400).send('Invalid data format.');
  }

  const payload = {
    data: data,
    rssi: rssi,
    timestamp: new Date().toISOString()
  };

  db.ref('esp32_data').push(payload)
    .then(() => {
      console.log("✅ Data stored:", payload);
      res.status(200).send("Data stored successfully");
    })
    .catch((error) => {
      console.error("❌ Firebase error:", error);
      res.status(500).send("Failed to store data");
    });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ESP32 backend running at http://localhost:${PORT}`);
});
