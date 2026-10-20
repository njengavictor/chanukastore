const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();

app.use(cors({ origin: "*", methods: ["GET","POST"] }));
app.use(express.json());

// Helper function to get Safaricom Access Token
async function getMpesaToken(req, res, next) {
  try {
    const consumerKey = process.env.CONSUMER_KEY;
    const consumerSecret = process.env.CONSUMER_SECRET;
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    
    const tokenRes = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { Authorization: `Basic ${auth}` }
    });
    
    req.token = tokenRes.data.access_token;
    next();
  } catch (err) {
    console.error("Token Error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Failed to connect to M-Pesa authentication" });
  }
}

// STK Push Route
app.post('/api/stkpush', getMpesaToken, async (req, res) => {
  try {
    const { phone, amount } = req.body;
    const shortCode = process.env.SHORTCODE;
    const passkey = process.env.PASSKEY;
    
    // Generate Timestamp (YYYYMMDDHHmmss)
    const date = new Date();
    const timestamp = 
      date.getFullYear().toString() +
      String(date.getMonth() + 1).padStart(2, '0') +
      String(date.getDate()).padStart(2, '0') +
      String(date.getHours()).padStart(2, '0') +
      String(date.getMinutes()).padStart(2, '0') +
      String(date.getSeconds()).padStart(2, '0');

    // Generate Password
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');

    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(amount),
        PartyA: phone,
        PartyB: shortCode,
        PhoneNumber: phone,
        CallBackURL: "https://chanukamarket.onrender.com/callback",
        AccountReference: "ChanukaMarket",
        TransactionDesc: "E-Commerce Payment"
      },
      { headers: { Authorization: `Bearer ${req.token}` } }
    );

    console.log("Safaricom success:", response.data);
    return res.json(response.data);

  } catch (err) {
    console.error("STK ERROR:", err.response?.data || err.message);
    return res.status(200).json(err.response?.data || { errorMessage: err.message, ResponseCode: 1 });
  }
});

// M-Pesa Callback Endpoint
app.post('/callback', (req, res) => {
  console.log("M-PESA CALLBACK RECEIVED:", JSON.stringify(req.body));
  // Here you can parse the callback to update order status in Supabase if payment was successful
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

app.get('/', (req, res) => res.json({ message: "Chanuka M-Pesa Backend Running" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
