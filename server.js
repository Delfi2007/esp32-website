const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies
app.use(bodyParser.json());

// Firebase Admin Initialization
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://esp32-iot-842e3-default-rtdb.asia-southeast1.firebasedatabase.app/"
});

const db = admin.database();

// ✅ FIXED: ThingsBoard Cloud Configuration
const THINGSBOARD_HOST = "https://thingsboard.cloud"; // Changed to ThingsBoard Cloud
const TB_ACCESS_TOKEN = "M9HR7Tdk8qoLO62pvzYv"; // Your device access token

// API Endpoint to receive data from ESP32
app.post('/lora', (req, res) => {
  const { deviceId, timestamp, voltage, current, power, energy, rssi } = req.body;

  // Basic validation
  if (!deviceId || typeof timestamp === 'undefined' || typeof voltage === 'undefined' ||
      typeof current === 'undefined' || typeof power === 'undefined' || typeof energy === 'undefined' ||
      typeof rssi === 'undefined') {
    return res.status(400).send('Invalid data format. Missing one or more required fields.');
  }

  // Firebase payload (keep as is)
  const firebasePayload = {
    deviceId: deviceId,
    timestamp_mcu: timestamp,
    voltage: voltage,
    current: current,
    power: power,
    energy: energy,
    rssi: rssi,
    timestamp_server: new Date().toISOString()
  };

  // ✅ FIXED: ThingsBoard telemetry payload format
  const thingsBoardPayload = {
    voltage: voltage,
    current: current,
    power: power,
    energy: energy,
    rssi: rssi,
    deviceId: deviceId,
    timestamp_mcu: timestamp
  };

  // Store in Firebase
  db.ref('power_monitor_data').push(firebasePayload)
    .then(() => {
      console.log("✅ Data stored in Firebase:", firebasePayload);

      // ✅ FIXED: Send to ThingsBoard Cloud with correct endpoint
      const thingsBoardUrl = `${THINGSBOARD_HOST}/api/v1/${TB_ACCESS_TOKEN}/telemetry`;
      
      return axios.post(thingsBoardUrl, thingsBoardPayload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });
    })
    .then(() => {
      console.log("📡 Data sent to ThingsBoard Cloud successfully");
      console.log("ThingsBoard URL:", `${THINGSBOARD_HOST}/api/v1/${TB_ACCESS_TOKEN}/telemetry`);
      console.log("Payload sent:", thingsBoardPayload);
      res.status(200).send("Data stored and sent successfully");
    })
    .catch((error) => {
      console.error("❌ Error details:");
      
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.error("Network connectivity issue:", error.message);
      } else if (error.response) {
        console.error("ThingsBoard HTTP error:", error.response.status, error.response.data);
      } else if (error.request) {
        console.error("No response from ThingsBoard:", error.message);
      } else {
        console.error("Request setup error:", error.message);
      }
      
      // Still send success to ESP32 if Firebase worked
      res.status(200).send("Data stored in Firebase, but ThingsBoard upload failed");
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    thingsboard_host: THINGSBOARD_HOST
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ESP32 backend running on port ${PORT}`);
  console.log(`📡 ThingsBoard Host: ${THINGSBOARD_HOST}`);
  console.log(`🔑 Using Access Token: ${TB_ACCESS_TOKEN}`);
});