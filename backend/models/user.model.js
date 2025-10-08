import mongoose from "mongoose";
import { type } from "os";

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique:true
    },
    password:{
        type: String,
    },
    mobile:{
        type: String,
        required: true, 
    },
    role:{
        type:String,
        enum:["user","owner","deliveryBoy","superadmin"],
        required:true
    },
    userType:{
        type:String,
        default:"student",
        required:function(){
            return this.role === "user"; // Only users need userType
        }
    },
    deliveryAllowed:{
        type:Boolean,
        default:true // Allow delivery for all users by default
    },
    isApproved:{
        type:Boolean,
        default:function(){
            // Require approval for owners and delivery boys; auto-approve users and superadmins
            return this.role === "user" || this.role === "superadmin";
        }
    },
    resetOtp:{
        type:String
    },
    isOtpVerified:{
        type:Boolean,
        default:false
    },
    otpExpires:{
        type:Date
    },
    socketId:{
     type:String,
     
    },
    isOnline:{
        type:Boolean,
        default:false
    },
   location:{
type:{type:String,enum:['Point'],default:'Point'},
coordinates:{type:[Number],default:[0,0]}
   }
  
}, { timestamps: true })

userSchema.index({location:'2dsphere'})


const User=mongoose.model("User",userSchema)
export default User