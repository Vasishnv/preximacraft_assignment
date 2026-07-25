import jwt from "jsonwebtoken"
import "dotenv/config.js"

export const authenticate = (req,res,next)=>{
    const authheader = req.headers.authorization;
    if (!authheader) {
    return res.status(401).json({ error: 'No token provided' });
        }
    const token = authheader.split(" ")[1]
    if(!token){
        return res.status(401).json({ error: 'No token provided' });
    }
    try{
        const decoded = jwt.verify(token,process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next()
    }
    catch(err){
       
            console.log("JWT verify error:", err.message);
            return res.status(401).json({ error: 'Invalid token provided' });

    }


}