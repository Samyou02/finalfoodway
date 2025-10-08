import mongoose from "mongoose";
import UserType from "./models/userType.model.js";

const createSampleUserTypes = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect("mongodb://localhost:27017/foodway");
        console.log("Connected to MongoDB");

        // Define sample user types
        const userTypes = [
            { name: "Student", deliveryAllowed: true, description: "University students with delivery access" },
            { name: "Faculty", deliveryAllowed: true, description: "Faculty members with delivery access" },
            { name: "Staff", deliveryAllowed: true, description: "University staff with delivery access" },
            { name: "Visitor", deliveryAllowed: false, description: "Campus visitors - pickup only" }
        ];

        // Check if user types already exist and create if they don't
        for (const userType of userTypes) {
            const existingUserType = await UserType.findOne({ name: userType.name });
            if (!existingUserType) {
                await UserType.create(userType);
                console.log(`Created user type: ${userType.name}`);
            } else {
                console.log(`User type already exists: ${userType.name}`);
            }
        }

        console.log("Sample user types creation completed");
        process.exit(0);
    } catch (error) {
        console.error("Error creating sample user types:", error);
        process.exit(1);
    }
};

createSampleUserTypes();