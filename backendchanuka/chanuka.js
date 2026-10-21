require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const BASE_URL = "https://sandbox.safaricom.co.ke";
const shortCode = process.env.MPESA_SHORTCODE || "174379";
const passkey = process.env.MPESA_PASSKEY;

app.use(helmet());
app.use(express.json({ limit: "10kb" }));
app.use(cors({
  origin: ['https://chanukamarket-three.vercel.app', 'http://localhost:5500', 'http://localhost:5173'],
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  validate: { xForwardedForHeader: false },
});
app.use(limiter);

app.get('/', (req, res) => {
  res.send('Backend API is running! Callback URL is /callback');
});

function getTimestamp() {
  const date = new Date();
  const pad = (n) => String(n).padStart(2,'0');
  return `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

async function getToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if(!key || !secret) throw new Error("Missing MPESA_CONSUMER_KEY/SECRET in Render Env");
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await axios.get(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` }
  });
  return res.data.access_token;
}

app.post("/stkpush", async (req,res)=>{
  try{
    if(!passkey) return res.status(500).json({ error: "MPESA_PASSKEY missing in Render" });
    
    let phone = String(req.body.phone || "").replace(/\D/g,"");
    if(phone.length < 10) return res.status(400).json({ error: "Invalid phone" });
    phone = phone.startsWith("0") ? "254"+phone.slice(1) : phone;
    phone = phone.startsWith("7") ? "254"+phone : phone;

    const token = await getToken();
    const timestamp = getTimestamp();
    const password = Buffer.from(shortCode+passkey+timestamp).toString("base64");
    const amount = Math.round(Number(req.body.amount) || 1);

    const payload = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: shortCode,
      PhoneNumber: phone,
      CallBackURL: "https://chanukamarket.onrender.com/callback",
      AccountReference: "ChanukaMarket",
      TransactionDesc: "Chanuka purchase"
    };

    const response = await axios.post(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, payload,{
      headers:{ Authorization:`Bearer ${token}` },
      timeout: 15000
    });
    
    // Return exactly what Safaricom returns so frontend sees ResponseCode
    res.json(response.data);

  }catch(e){
    console.log("STK ERROR:", e.response?.data || e.message);
    res.status(500).json({ error: "Payment failed", details: e.response?.data || e.message });
  }
});

app.post("/callback", (req, res) => {
  console.log("=== M-PESA CALLBACK ===", JSON.stringify(req.body, null, 2));
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});
app.get('/callback', (req,res) => res.send('Callback working'));

let sellers = [];
app.post("/request-to-sell", (req,res)=>{
  const { name, phone, businessName } = req.body;
  if(!name || !phone || !businessName) return res.status(400).json({error:"Fill all fields"});
  sellers.push({ name, phone, businessName, status: "pending", date: new Date() });
  console.log(`NEW SELLER: ${businessName} - ${phone}`);
  res.json({ success: true, message: "Request sent. Admin will contact you in 24hrs" });
});

app.listen(PORT, ()=>console.log(`API on ${PORT}`));
