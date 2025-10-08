import mongoose from "mongoose";

const userTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        default: ""
    },
    deliveryAllowed: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const UserType = mongoose.model("UserType", userTypeSchema);
export default UserType;