import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";


export const signup = async(req,res)=>{
    try{
        const {email,password,name} = req.body;
        if(!email||!name||!password){
            return res.status(400).json({error:"All fields are required !"});
        }
        const existing_user = await prisma.user.findUnique({where:{email}});
        if(existing_user){
            return res.status(400).json({error:"Email already exists !"});
        }
        const passwordHash = await bcrypt.hash(password,10)

        const user = await prisma.user.create({
            data :{email,passwordHash,name},
        });

        const token = jwt.sign(
            {userId:user.id},
            process.env.JWT_SECRET,
            {expiresIn:"7d"}
        )
        return res.status(201).json({
            token,
            user : {email:user.email,id:user.id,name:user.name},
        })

    }
    catch(err){
        console.log(err)
        return res.status(500).json({error:"Something went wrong, Please try again later."})
    }

}

export const login =async (req,res) =>{
    try{
        const {email,password} = req.body;
        if(!email||!password){
            return res.status(400).json({error:"All fields are required !"});
        }
        const user = await prisma.user.findUnique({where:{email}});
        if(!user){
            return res.status(401).json({error:"Invalid credentials !"});
        }
        const valid = await bcrypt.compare(password,user.passwordHash);
        if(!valid){
            return res.status(401).json({error:"Invalid credentials !"});
        }
        const token = jwt.sign(
            {userId:user.id},
            process.env.JWT_SECRET,
            {expiresIn:"7d"}
       
        )
        return res.status(200).json({
            token,
            user :{id:user.id,email:user.email,name:user.name},
        });
    }
    catch(err){
        console.log(err)
        return res.status(500).json({error:"Something went wrong, Please try again later."})

    }
}