import mongoose from "mongoose"
import { MongoMemoryServer } from "mongodb-memory-server"
import User from "../models/user.model.js"
import Category from "../models/category.model.js"

let memoryServer = null

const connectDb = async () => {
    const mongoUri = process.env.MONGODB_URL || "mongodb://127.0.0.1:27017/foodway"
    try {
        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000
        })
        console.log(`db connected (${mongoUri})`)
    } catch (error) {
        console.error("db error:", error?.message || error)
        console.log("Starting in-memory MongoDB for development fallback...")
        try {
            memoryServer = await MongoMemoryServer.create()
            const memUri = memoryServer.getUri()
            await mongoose.connect(memUri)
            console.log("Connected to in-memory MongoDB")

            // Minimal seed so login can work in dev
            const existingAdmin = await User.findOne({ email: "superadmin@foodway.com" })
            if (!existingAdmin) {
                const bcrypt = (await import("bcryptjs")).default
                const admin = new User({
                    fullName: "Super Admin",
                    email: "superadmin@foodway.com",
                    password: await bcrypt.hash("superadmin123", 10),
                    mobile: "9999999999",
                    role: "superadmin",
                    isApproved: true
                })
                await admin.save()
                console.log("Seeded superadmin: superadmin@foodway.com / superadmin123")
            }

            const categoriesCount = await Category.countDocuments()
            if (categoriesCount === 0) {
                await Category.create([
                    { name: "Snacks", description: "Light snacks and appetizers" },
                    { name: "Main Course", description: "Full meals and main dishes" },
                    { name: "Desserts", description: "Sweet treats and desserts" },
                    { name: "Beverages", description: "Drinks and refreshments" }
                ])
                console.log("Seeded basic categories")
            }
        } catch (memErr) {
            console.error("Failed to start in-memory MongoDB:", memErr?.message || memErr)
        }
    }
}

export default connectDb