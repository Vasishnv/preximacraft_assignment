import express from 'express';
import cors from "cors";
import "dotenv/config"
import authrouter from "./routes/route.auth.js"
import planrouter from './routes/route.plans.js'
import checkoutrouter from "./routes/route.checkout.js"
import subrouter from './routes/route.sub.js';

const app = express();
app.use(cors())
app.use(express.json())

app.use("/api/auth",authrouter);
app.use("/api/plans",planrouter);
app.use("/api/checkout",checkoutrouter);
app.use("/api/subscriptions",subrouter);
const PORT = 3001;
app.listen(PORT,()=>{
    console.log(`Server running on port ${PORT}`);
})