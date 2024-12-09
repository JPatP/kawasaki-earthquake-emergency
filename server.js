require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

// Middleware to parse JSON data
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));


// File path for mock JSON data
const filePath = path.join(__dirname, 'mock_earthquake_data.json');

// Twilio Credentials 
const accountSid = process.env.TWILIO_ACCOUNT_SID; 
const authToken = process.env.TWILIO_AUTH_TOKEN;   
const client = require('twilio')(accountSid, authToken);

// Function to send SMS
const sendSmsAlert = (message, recipientNumber) => {
    client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER, 
        to: '+818049284774'
    })
    .then((msg) => console.log('SMS sent successfully:', msg.sid))
    .catch((err) => console.error('Error sending SMS:', err));
};

// Function to generate random earthquake data
function generateRandomEarthquake() {
    const magnitude = (Math.random() * (8.0 - 3.0) + 3.0).toFixed(1);
    const newEarthquake = {
        id: new Date().toISOString().replace(/[-:.TZ]/g, ''),
        timestamp: new Date().toISOString(),
        location: 'Kawasaki City',
        magnitude: parseFloat(magnitude),
        depth: Math.floor(Math.random() * 30) + 1, // Random depth between 1 and 30 km
        instructions: 'Please Drop, Cover, Hold On and Move to an open area away from building and watch out for falling debris',
    };
    return newEarthquake;
}

// Endpoint to get the mock JSON data
app.get('/mock-data', (req, res) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading JSON file:', err);
            return res.status(500).send('Error reading mock data');
        }
        res.json(JSON.parse(data));
    });
});

// Endpoint to add a new earthquake entry
app.post('/add-earthquake', (req, res) => {
    const newEarthquake = req.body;

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading JSON file:', err);
            return res.status(500).send('Error reading mock data');
        }

        let earthquakeData = [];
        try {
            earthquakeData = JSON.parse(data);
        } catch (parseErr) {
            console.error('Error parsing JSON data:', parseErr);
            return res.status(500).send('Error parsing mock data');
        }

        earthquakeData.unshift(newEarthquake);

        fs.writeFile(filePath, JSON.stringify(earthquakeData, null, 2), (err) => {
            if (err) {
                console.error('Error writing JSON file:', err);
                return res.status(500).send('Error saving mock data');
            }
            res.send('New earthquake data added successfully!');
        });
    });
});

// Automatically add new earthquake data every 2 minutes
setInterval(() => {
    const newEarthquake = generateRandomEarthquake();

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading JSON file:', err);
            return;
        }

        let earthquakeData = [];
        try {
            earthquakeData = JSON.parse(data);
        } catch (parseErr) {
            console.error('Error parsing JSON data:', parseErr);
            return;
        }

        earthquakeData.unshift(newEarthquake);

        fs.writeFile(filePath, JSON.stringify(earthquakeData, null, 2), (err) => {
            if (err) {
                console.error('Error writing JSON file:', err);
            } else {
                console.log('New earthquake data added:', newEarthquake);
            }
        });
    });
}, 2 * 60 * 1000); // Every 2 minutes

// Polling for new earthquake data every 30 seconds
let lastEarthquakeId = null;

setInterval(() => {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading JSON file during polling:', err);
            return;
        }

        let earthquakeData = [];
        try {
            earthquakeData = JSON.parse(data);
        } catch (parseErr) {
            console.error('Error parsing JSON data during polling:', parseErr);
            return;
        }

        const latestEarthquake = earthquakeData[0];

        if (latestEarthquake && latestEarthquake.id !== lastEarthquakeId) {
            lastEarthquakeId = latestEarthquake.id;
            console.log('New earthquake detected:', latestEarthquake);

            // Construct the SMS message
            const smsMessage = `[Earthquake Alert]
Magnitude ${latestEarthquake.magnitude} earthquake near ${latestEarthquake.location}!
Please Drop, Cover, Hold On and Move to an open area away from building and watch out for falling debris.
For more help and emergency information: https://kawasaki-emergency-earthquake.netlify.app/`;

            // Send SMS
            sendSmsAlert(smsMessage, '+818049284774'); 
        }
    });
}, 30 * 1000); // Every 30 seconds

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
