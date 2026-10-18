const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();

// 1. CORS MUST BE FIRST
app.use(cors({ origin: "*", methods: ["GET","POST"] }));
app.use(express.json());

// 2. Fix route to /api/stkpush to match frontend
app.post('/api/stkpush', async (req, res) => {
  console.log("STK Request body:", req.body);
  try {
    // Get token - add your token logic here if not done
    const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString('base64');
    const tokenRes = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { Authorization: `Basic ${auth}` }
    });
    const token = tokenRes.data.access_token;

    // ... your password, timestamp logic ...

    const response = await axios.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: process.env.SHORTCODE,
        Password: "your_password",
        Timestamp: "your_timestamp",
        TransactionType: "CustomerPayBillOnline",
        Amount: req.body.amount,
        PartyA: req.body.phone,
        PartyB: process.env.SHORTCODE,
        PhoneNumber: req.body.phone,
        CallBackURL: "https://backendchanuka.onrender.com/callback",
        AccountReference: "Chanuka",
        TransactionDesc: "Payment"
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("Safaricom success:", response.data);
    return res.json(response.data); // Send back exactly what Safaricom sent

  } catch (err) {
    console.error("STK ERROR:", err.response?.data || err.message);
    // FIX: Safe error handling - never crash
    return res.status(200).json(err.response?.data || { errorMessage: err.message, ResponseCode: 1 });
  }
});

// 3. Callback
app.post('/callback', (req, res) => {
  console.log("M-PESA CALLBACK:", JSON.stringify(req.body));
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

app.get('/', (req,res) => res.json({ message: "Backend running" }));

// Render uses process.env.PORT, not 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`M-Pesa server running on port ${PORT}`));
