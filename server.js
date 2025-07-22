const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const axios = require('axios'); // ✅ Added for ThingsBoard integration

const app = express();
const PORT = process.env.PORT || 3000; // Allow dynamic port on Render

// Parse JSON bodies
app.use(bodyParser.json());

// Firebase Admin Initialization using ENV variable
// IMPORTANT: Ensure your FIREBASE_KEY environment variable on Render
// contains the service account JSON as a single-line string.
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://esp32-iot-842e3-default-rtdb.asia-southeast1.firebasedatabase.app/"
});

const db = admin.database();

// ✅ ThingsBoard Configuration
const THINGSBOARD_HOST = "https://thingsboard.cloud"; // Changed to ThingsBoard Cloud
const TB_ACCESS_TOKEN = "M9HR7Tdk8qoLO62pvzYv"; // Your device access token

// API Endpoint to receive data from ESP32
app.post('/lora', (req, res) => {
  // Directly destructure the fields from req.body, as ESP32 is sending them directly
  const { deviceId, timestamp, voltage, current, power, energy, rssi } = req.body;

  // Basic validation to ensure essential fields are present
  if (!deviceId || typeof timestamp === 'undefined' || typeof voltage === 'undefined' ||
      typeof current === 'undefined' || typeof power === 'undefined' || typeof energy === 'undefined' ||
      typeof rssi === 'undefined') {
    return res.status(400).send('Invalid data format. Missing one or more required fields.');
  }

  // Construct the payload to store in Firebase
  const payload = {
    deviceId: deviceId,
    timestamp_mcu: timestamp,
    voltage: voltage,
    current: current,
    power: power,
    energy: energy,
    rssi: rssi,
    timestamp_server: new Date().toISOString()
  };

  // Push the structured payload to Firebase
  db.ref('power_monitor_data').push(payload)
    .then(() => {
      console.log("✅ Data stored:", payload);

      // 🔄 Send to ThingsBoard
      axios.post(`${THINGSBOARD_HOST}/api/v1/${TB_ACCESS_TOKEN}/telemetry`, payload)
        .then(() => {
          console.log("📡 Data sent to ThingsBoard");
        })
        .catch((error) => {
          console.error("❌ ThingsBoard HTTP error:", error.message);
        });

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
