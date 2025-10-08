import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import Category from '../models/category.model.js';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

const seedData = async () => {
    try {
        await connectDB();

        // Clear existing data
        console.log("Clearing existing data...");
        await User.deleteMany({});
        await Category.deleteMany({});

        // Create superadmin only
        console.log("Creating superadmin...");
        const superadmin = new User({
            fullName: "Super Admin",
            email: "superadmin@foodway.com",
            password: await bcrypt.hash("superadmin123", 10),
            mobile: "9999999999",
            role: "superadmin",
            isApproved: true
        });

        await superadmin.save();
        console.log("Superadmin created: superadmin@foodway.com");

        // Create categories
        console.log("Creating categories...");
        const categories = [
            { name: "Snacks", description: "Light snacks and appetizers" },
            { name: "Main Course", description: "Full meals and main dishes" },
            { name: "Desserts", description: "Sweet treats and desserts" },
            { name: "Beverages", description: "Drinks and refreshments" },
            { name: "Fast Food", description: "Quick and easy meals" },
            { name: "Indian", description: "Traditional Indian cuisine" },
            { name: "Chinese", description: "Chinese dishes and specialties" },
            { name: "Italian", description: "Italian cuisine and pasta" },
            { name: "Continental", description: "Continental dishes" },
            { name: "South Indian", description: "South Indian specialties" },
            { name: "North Indian", description: "North Indian cuisine" }
        ];

        // Use create instead of insertMany so pre-save middleware runs
        await Category.create(categories);
        console.log("Categories created");

        console.log("\n=== SEED DATA SUMMARY ===");
        console.log("Superadmin credentials:");
        console.log("Email: superadmin@foodway.com");
        console.log("Password: superadmin123");
        console.log("\nAll sample users have been removed.");
        console.log("You can now add your own users for testing.");
        console.log(`Total categories created: ${categories.length}`);
        console.log("========================");

        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedData();