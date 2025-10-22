import User from "../models/user.model.js"
import bcrypt, { hash } from "bcryptjs"
import genToken from "../utils/token.js"
import { sendOtpMail } from "../utils/mail.js"
export const signUp=async (req,res) => {
    try {
        const {fullName,email,password,mobile,role,userType}=req.body
        let user=await User.findOne({email})
        if(user){
            return res.status(400).json({message:"User Already exist."})
        }
        if(password.length<6){
            return res.status(400).json({message:"password must be at least 6 characters."})
        }
        if(mobile.length<10){
            return res.status(400).json({message:"mobile no must be at least 10 digits."})
        }
     
        const hashedPassword=await bcrypt.hash(password,10)
        
        // Create user data object
        const userData = {
            fullName,
            email,
            role,
            mobile,
            password:hashedPassword
        };
        
        // Add userType only for users
        if(role === "user" && userType) {
            userData.userType = userType;
            
            // Set delivery permission based on user type
            const UserType = (await import("../models/userType.model.js")).default;
            const userTypeDoc = await UserType.findOne({ name: userType });
            if(userTypeDoc) {
                userData.deliveryAllowed = userTypeDoc.deliveryAllowed;
            }
        }
        
        user=await User.create(userData)

        // For owners and delivery boys, do NOT authenticate on signup
        if (user.role === "owner" || user.role === "deliveryBoy") {
            return res.status(201).json({
                message: "Account created. Pending superadmin approval.",
                pendingApproval: true
            })
        }

        const token=await genToken(user)
        res.cookie("token",token,{
            secure:false,
            sameSite:"lax",
            maxAge:7*24*60*60*1000,
            httpOnly:true
        })

        return res.status(201).json({
            ...user.toObject(),
            token: token
        })

    } catch (error) {
        return res.status(500).json(`sign up error ${error}`)
    }
}

export const signIn=async (req,res) => {
    try {
        const {email,password}=req.body
        const user=await User.findOne({email})
        if(!user){
            return res.status(400).json({message:"User does not exist."})
        }
        // If the account was created via Google auth, there may be no password
        if(!user.password){
            return res.status(400).json({message:"This account uses Google Sign-In. Please sign in with Google or set a password using Forgot Password."})
        }
        
        // Require approval for owners and delivery boys before login
        if((user.role === "deliveryBoy" || user.role === "owner") && !user.isApproved){
            return res.status(403).json({message:"Your account is pending approval from superadmin."})
        }
        
     const isMatch=await bcrypt.compare(password,user.password)
     if(!isMatch){
         return res.status(400).json({message:"incorrect Password"})
     }

    const token=await genToken(user)
        res.cookie("token",token,{
            secure:false,
            sameSite:"lax",
            maxAge:7*24*60*60*1000,
            httpOnly:true
        })
  
        return res.status(200).json({
            ...user.toObject(),
            token: token
        })

    } catch (error) {
        console.error('Sign in error:', error)
        return res.status(500).json({message:"Internal Server Error during sign-in"})
    }
}

export const signOut=async (req,res) => {
    try {
        res.clearCookie("token")
return res.status(200).json({message:"log out successfully"})
    } catch (error) {
        return res.status(500).json(`sign out error ${error}`)
    }
}

export const sendOtp=async (req,res) => {
  try {
    const {email}=req.body
    
    if (!email) {
      return res.status(400).json({message: "Email is required"})
    }
    
    const user=await User.findOne({email})
    if(!user){
       return res.status(400).json({message:"User does not exist."})
    }
    
    const otp=Math.floor(1000 + Math.random() * 9000).toString()
    user.resetOtp=otp
    user.otpExpires=Date.now()+5*60*1000
    user.isOtpVerified=false
    await user.save()
    
    console.log(`[AUTH] Generated OTP for ${email}: ${otp}`)
    
    try {
      await sendOtpMail(email, otp)
      console.log(`[AUTH] OTP email sent successfully to ${email}`)
      return res.status(200).json({message: "OTP sent successfully to your email"})
    } catch (emailError) {
      console.error(`[AUTH] Failed to send OTP email to ${email}:`, emailError)
      // Still return success but with a note about email delivery
      return res.status(200).json({
        message: "OTP generated successfully. If you don't receive the email, please check your spam folder or try again.",
        warning: "Email delivery may be delayed"
      })
    }
  } catch (error) {
     console.error('[AUTH] Send OTP error:', error)
     return res.status(500).json({message: `Send OTP error: ${error.message}`})
  }  
}

export const verifyOtp=async (req,res) => {
    try {
        const {email,otp}=req.body
        const user=await User.findOne({email})
        if(!user || user.resetOtp!=otp || user.otpExpires<Date.now()){
            return res.status(400).json({message:"invalid/expired otp"})
        }
        user.isOtpVerified=true
        user.resetOtp=undefined
        user.otpExpires=undefined
        await user.save()
        return res.status(200).json({message:"otp verify successfully"})
    } catch (error) {
         return res.status(500).json(`verify otp error ${error}`)
    }
}

export const resetPassword=async (req,res) => {
    try {
        const {email,newPassword}=req.body
        const user=await User.findOne({email})
    if(!user || !user.isOtpVerified){
       return res.status(400).json({message:"otp verification required"})
    }
    const hashedPassword=await bcrypt.hash(newPassword,10)
    user.password=hashedPassword
    user.isOtpVerified=false
    await user.save()
     return res.status(200).json({message:"password reset successfully"})
    } catch (error) {
         return res.status(500).json(`reset password error ${error}`)
    }
}

export const googleAuth=async (req,res) => {
    try {
        const {fullName,email,role,mobile,userType}=req.body
        let user=await User.findOne({email})
        if(user){
            const token=await genToken(user)
            res.cookie("token",token,{
                secure:false,
                sameSite:"lax",
                maxAge:7*24*60*60*1000,
                httpOnly:true
            })
            return res.status(200).json({
                ...user.toObject(),
                token: token
            })
        }
        
        // Create user data object
        const userData = {
            fullName,
            email,
            role,
            mobile
        };
        
        // Add userType only for users
        if(role === "user" && userType) {
            userData.userType = userType;
            
            // Set delivery permission based on user type
            const UserType = (await import("../models/userType.model.js")).default;
            const userTypeDoc = await UserType.findOne({ name: userType });
            if(userTypeDoc) {
                userData.deliveryAllowed = userTypeDoc.deliveryAllowed;
            }
        }
        
        user=await User.create(userData)

        // For owners and delivery boys, do NOT authenticate on signup
        if (user.role === "owner" || user.role === "deliveryBoy") {
            return res.status(201).json({
                message: "Account created. Pending superadmin approval.",
                pendingApproval: true
            })
        }

        const token=await genToken(user)
        res.cookie("token",token,{
            secure:false,
            sameSite:"lax",
            maxAge:7*24*60*60*1000,
            httpOnly:true
        })
        return res.status(201).json({
            ...user.toObject(),
            token: token
        })

    } catch (error) {
        return res.status(500).json(`google auth error ${error}`)
    }
}