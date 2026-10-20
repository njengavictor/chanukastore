require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const app = express();
// Allow your Vercel frontend URL (No trailing slashes!)
app.use(cors({
  origin: ['https://chanukamarket-three.vercel.app', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());

// Simple health check route so hitting https://backendchanuka.onrender.com doesn't show "Cannot GET /"
app.get('/', (req, res) => {
  res.send('Backend API is running!');
});

// SECURITY 1: Hide headers
app.use(helmet());

// SECURITY 2: Only allow your website to call API
app.use(cors({
  origin: ["http://localhost:5500", "https://your-chanuka-domain.com"], // add your real domain
  methods: ["POST"]
}));

// SECURITY 3: Stop hackers from spamming STK
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // max 5 STK attempts per IP
  message: { error: "Too many requests, try after 5 mins" }
});
app.use("/stkpush", limiter);

app.use(express.json({ limit: "10kb" })); // block big payloads

const PORT = 3000;
const BASE_URL = "https://sandbox.safaricom.co.ke";
const shortCode = "174379";
const passkey = process.env.MPESA_PASSKEY; // MOVE PASSKEY TO .env!

// ... keep your getTimestamp(), normalizePhone(), getToken() functions ...

app.post("/stkpush", async (req,res)=>{
  try{
    // SECURITY 4: Validate input
    let phone = String(req.body.phone || "").replace(/\D/g,"");
    if(phone.length < 10 || phone.length > 12) {
      return res.status(400).json({ error: "Invalid phone number" });
    }
    phone = phone.startsWith("0") ? "254"+phone.slice(1) : phone;
    if(!phone.startsWith("2547") && !phone.startsWith("2541")){
       return res.status(400).json({ error: "Only Safaricom numbers allowed" });
    }

    const token = await getToken();
    const timestamp = getTimestamp();
    const password = Buffer.from(shortCode+passkey+timestamp).toString("base64");

    const payload = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: 1,
      PartyA: phone,
      PartyB: shortCode,
      PhoneNumber: phone,
      CallBackURL: "https://mydomain.com/callback", // Must be https://
      AccountReference: "Chanuka",
      TransactionDesc: "Chanuka purchase"
    };

    const response = await axios.post(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, payload,{
      headers:{ Authorization:`Bearer ${token}` },
      timeout: 10000
    });
    
    // SECURITY 5: Don't send full Safaricom response to frontend
    res.json({ success: true, message: "STK Sent", CheckoutRequestID: response.data.CheckoutRequestID });

  }catch(e){
    console.log("STK ERROR:", e.response?.data || e.message);
    res.status(500).json({ error: "Payment failed, try again" }); // generic message to user
  }
});

app.listen(PORT, ()=>console.log(`Secure Chanuka API on ${PORT}`));

// Temporary storage (later use MongoDB/Supabase)
let sellers = [];
let productsPending = [];

app.post("/request-to-sell", (req,res)=>{
  const { name, phone, businessName, idNumber } = req.body;
  
  // Basic validation
  if(!name || !phone || !businessName) return res.status(400).json({error:"Fill all fields"});
  
  sellers.push({ name, phone, businessName, idNumber, status: "pending", date: new Date() });
  
  // SECURITY: Notify you via WhatsApp/Email manually for now
  console.log(`NEW SELLER REQUEST: ${businessName} - ${phone}`);
  
  res.json({ success: true, message: "Request sent. Admin will contact you on WhatsApp in 24hrs" });
});

app.post("/seller/add-product", (req,res)=>{
  const { sellerPhone, productName, price, image, category } = req.body;
  
  // Check if seller is approved
  const seller = sellers.find(s => s.phone === sellerPhone && s.status === "approved");
  if(!seller) return res.status(403).json({ error: "You are not approved as seller yet" });

  productsPending.push({ sellerPhone, productName, price, image, category, status: "pending" });
  
  res.json({ success: true, message: "Product sent for review" });
});

// Admin approves
app.post("/admin/approve", (req,res)=>{
  const { adminKey, sellerPhone } = req.body;
  if(adminKey !== process.env.ADMIN_KEY) return res.status(401).json({error:"Not admin"});
  
  const seller = sellers.find(s => s.phone === sellerPhone);
  if(seller) seller.status = "approved";
  
  res.json({ success: true, sellers });
});
