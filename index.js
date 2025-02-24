// index.js
const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'your-secure-api-key';

app.use(bodyParser.json());

let sock; // To store the WhatsApp connection

// Start WhatsApp bot
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    sock = makeWASocket({ auth: state, printQRInTerminal: true });

    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;
        if (qr) {
            console.log('📸 Scan this QR code:');
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'open') {
            console.log('✅ WhatsApp connected!');
        } else if (connection === 'close') {
            console.log('❌ Connection closed. Reconnecting...');
            startBot();
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

// API endpoint to send WhatsApp messages
app.post('/send-message', (req, res) => {
    const { apiKey, recipients, message } = req.body;


    // Check API key
    if (apiKey !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
    }

    // Validate inputs
    if (!recipients || !message) {
        return res.status(400).json({ error: 'Phone and message are required' });
    }


    const sendMessages = async () => {
        for (const phone of recipients) {
            // Format phone number (WhatsApp requires international format)
            const formattedPhone = phone.includes('@s.whatsapp.net')
                ? phone
                : `${phone}@s.whatsapp.net`;

            const delay = Math.floor(Math.random() * (25000 - 15000 + 1)) + 15000;
            console.log(`⏳ Sending to ${phone} after ${delay / 1000} seconds...`);

            await new Promise((resolve) => setTimeout(resolve, delay)); // Delay before sending

            try {
                await sock.sendMessage(formattedPhone, { text: message });
                console.log(`✅ Message sent to ${phone}`);
            } catch (err) {
                console.error(`❌ Failed to send message to ${phone}:`, err);
            }
        }
    };

    // Start message queue and respond immediately
    sendMessages();
    res.json({ success: true, message: 'Bulk messaging started. Check logs for progress.' });
});

// Start Express server
app.listen(PORT, () => {
    console.log(`🚀 API running on http://localhost:${PORT}`);
});

startBot();
