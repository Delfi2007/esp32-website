const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const app = express();
const PORT = process.env.PORT || 3000; // Allow dynamic port on Render

// Parse JSON bodies
app.use(bodyParser.json());

// Firebase Admin Initialization using ENV variable
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY); // key as string in Render

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://esp32-iot-842e3-default-rtdb.asia-southeast1.firebasedatabase.app/"
});

const db = admin.database();

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
  console.log(`🚀 ESP32 backend running on port ${PORT}`);
});
