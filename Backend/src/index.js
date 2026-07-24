import express from 'express';
import cors from "cors";
import "dotenv/config"
import authrouter from "./routes/route.auth.js"

const app = express();
app.use(cors())
app.use(express.json())

app.use("/api/auth",authrouter);
const PORT = 3001;
app.listen(PORT,()=>{
    console.log(`Server running on port ${PORT}`);
})