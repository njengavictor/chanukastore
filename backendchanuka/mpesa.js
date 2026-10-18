const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const consumerKey = "88xcT9oaYC79ODAkmPaReGt9zQdcJEhZtAQ1XGVc5l7JJC17";
const consumerSecret = "XLiTptXkGApygm52dmIE2dmEoG2W7Tf4z91zMXBm4pEj5naeNwrCSc7X9O1c6OLh";
const shortCode = "174379"; // Your Till, for test use 174379
const passkey = "[bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919]"; // Your Passkey
const myphonetill = "0114044517"; // For Pochi la Biashara

// 1. Get Access Token
async function getToken() {
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const res = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
    headers: { Authorization: `Basic ${auth}` }
  });
  return res.data.access_token;
}

// 2. STK Push Route
app.post('/stkpush', async (req, res) => {
  const { phone, amount } = req.body; // phone = 2547XXXXXXXX

  const token = await getToken();
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0,14);
  const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');

  // Clean phone: 07... to 2547...
  let cleanPhone = phone.replace(/^0/, '254');

  const data = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerBuyGoodsOnline", // Use CustomerBuyGoodsOnline for Till, CustomerPayBillOnline for Paybill
    Amount: amount,
    PartyA: cleanPhone,
    PartyB: shortCode,
    PhoneNumber: cleanPhone,
    CallBackURL: "https://your-domain.com/callback", // Use your domain
    AccountReference: "ChanukaStore",
    TransactionDesc: "Payment for Chanuka"
  };

  try {
    const response = await axios.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json(err.response.data);
  }
});

// 3. Callback - Safaricom tells you if paid
app.post('/callback', (req, res) => {
  console.log("M-PESA CALLBACK:", JSON.stringify(req.body));
  // Here save to your database: Paid, order ID etc.
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

app.listen(3000, () => console.log("M-Pesa server running on port 3000"));