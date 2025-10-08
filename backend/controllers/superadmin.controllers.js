import User from "../models/user.model.js";
import Category from "../models/category.model.js";
import UserType from "../models/userType.model.js";
import uploadToCloudinary from "../utils/s3Upload.js";

// Get all pending owners for approval
export const getPendingOwners = async (req, res) => {
    try {
        const pendingOwners = await User.find({ 
            role: "owner", 
            isApproved: false 
        }).select("-password -resetOtp");
        
        res.status(200).json(pendingOwners);
    } catch (error) {
        res.status(500).json({ message: `Error fetching pending owners: ${error}` });
    }
};

// Get all pending delivery boys for approval
export const getPendingDeliveryBoys = async (req, res) => {
    try {
        const pendingDeliveryBoys = await User.find({ 
            role: "deliveryBoy", 
            isApproved: false 
        }).select("-password -resetOtp");
        
        res.status(200).json(pendingDeliveryBoys);
    } catch (error) {
        res.status(500).json({ message: `Error fetching pending delivery boys: ${error}` });
    }
};

// Approve or reject owner
export const updateOwnerStatus = async (req, res) => {
    try {
        const { userId, action } = req.body; // action: 'approve' or 'reject'
        
        if (action === 'approve') {
            await User.findByIdAndUpdate(userId, { isApproved: true });
            res.status(200).json({ message: "Owner approved successfully" });
        } else if (action === 'reject') {
            await User.findByIdAndDelete(userId);
            res.status(200).json({ message: "Owner rejected and removed" });
        } else {
            res.status(400).json({ message: "Invalid action" });
        }
    } catch (error) {
        res.status(500).json({ message: `Error updating owner status: ${error}` });
    }
};

// Approve or reject delivery boy
export const updateDeliveryBoyStatus = async (req, res) => {
    try {
        const { userId, action } = req.body; // action: 'approve' or 'reject'
        
        if (action === 'approve') {
            await User.findByIdAndUpdate(userId, { isApproved: true });
            res.status(200).json({ message: "Delivery boy approved successfully" });
        } else if (action === 'reject') {
            await User.findByIdAndDelete(userId);
            res.status(200).json({ message: "Delivery boy rejected and removed" });
        } else {
            res.status(400).json({ message: "Invalid action" });
        }
    } catch (error) {
        res.status(500).json({ message: `Error updating delivery boy status: ${error}` });
    }
};

// Get all categories
export const getCategories = async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true });
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ message: `Error fetching categories: ${error}` });
    }
};

// Create new category
export const createCategory = async (req, res) => {
    try {
        console.log('Request body:', req.body);
        console.log('Request file:', req.file);
        
        const { name, description } = req.body;
        
        if (!name || !name.trim()) {
            console.log('Category creation failed: Name is required');
            return res.status(400).json({ message: "Name is required" });
        }
        
        // Check for existing category (case-insensitive)
        const existingCategory = await Category.findOne({ 
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
            isActive: true 
        });
        if (existingCategory) {
            console.log(`Category creation failed: Category '${name}' already exists`);
            return res.status(400).json({ message: `Category '${name}' already exists` });
        }
        
        let image = null;
        if (req.file) {
            try {
                console.log('Attempting to upload image to Cloudinary...');
                image = await uploadToCloudinary(req.file);
                if (image) {
                    console.log('Image uploaded successfully:', image);
                } else {
                    console.log('Cloudinary upload returned null - not configured, creating category without image');
                }
            } catch (uploadError) {
                console.error('Cloudinary upload failed:', uploadError);
                // Continue without image if Cloudinary fails
                console.log('Creating category without image due to Cloudinary error');
            }
        }
        
        const category = await Category.create({ 
            name: name.trim(), 
            description: description || '', 
            image: image || '' 
        });
        console.log('Category created successfully:', category);
        res.status(201).json(category);
    } catch (error) {
        console.error('Category creation error:', error);
        if (error.code === 11000) {
            // MongoDB duplicate key error
            return res.status(400).json({ message: "Category name already exists" });
        }
        res.status(500).json({ message: `Error creating category: ${error.message}` });
    }
};

// Update category
export const updateCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { name, description } = req.body;
        
        console.log('Update category request:', { categoryId, name, description });
        console.log('Request file:', req.file);
        
        if (!name) {
            return res.status(400).json({ message: "Name is required" });
        }
        
        // Check if category exists
        const existingCategory = await Category.findById(categoryId);
        if (!existingCategory) {
            return res.status(404).json({ message: "Category not found" });
        }
        
        // Check if name is already taken by another category
        const duplicateCategory = await Category.findOne({ 
            name, 
            _id: { $ne: categoryId },
            isActive: true 
        });
        if (duplicateCategory) {
            return res.status(400).json({ message: "Category name already exists" });
        }
        
        // Prepare update data
        const updateData = { name, description };
        
        // Handle image upload if provided
        if (req.file) {
            try {
                const imageUrl = await uploadToCloudinary(req.file);
                if (imageUrl) {
                    updateData.image = imageUrl;
                    console.log('Image uploaded successfully:', imageUrl);
                } else {
                    console.log('Cloudinary upload skipped - not configured, continuing without image update');
                }
            } catch (uploadError) {
                console.error('Cloudinary upload failed during update:', uploadError);
                // Continue without image update instead of failing the entire operation
                console.log('Continuing category update without image due to Cloudinary error');
            }
        }
        
        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId, 
            updateData, 
            { new: true }
        );
        
        res.status(200).json(updatedCategory);
    } catch (error) {
        console.error('Category update error:', error);
        res.status(500).json({ message: `Error updating category: ${error.message}` });
    }
};

// Delete category
export const deleteCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        
        await Category.findByIdAndUpdate(categoryId, { isActive: false });
        res.status(200).json({ message: "Category deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: `Error deleting category: ${error}` });
    }
};

// Get users by role with search and count
export const getUsersByRole = async (req, res) => {
    try {
        const { role, search } = req.query;
        
        let query = {};
        if (role && role !== 'all') {
            query.role = role;
        }
        
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { mobile: { $regex: search, $options: 'i' } }
            ];
        }
        
        const users = await User.find(query).select("-password -resetOtp");
        
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: `Error fetching users: ${error}` });
    }
};

// Get dashboard stats
export const getDashboardStats = async (req, res) => {
    try {
        const userCount = await User.countDocuments({ role: "user" });
        const ownerCount = await User.countDocuments({ role: "owner" });
        const deliveryBoyCount = await User.countDocuments({ role: "deliveryBoy", isApproved: true });
        const pendingOwnerCountActual = await User.countDocuments({ role: "owner", isApproved: false });
        const categoryCount = await Category.countDocuments({ isActive: true });
        
        res.status(200).json({
            userCount,
            ownerCount,
            deliveryBoyCount,
            pendingOwnerCount: pendingOwnerCountActual, // Field name expected by frontend
            categoryCount
        });
    } catch (error) {
        res.status(500).json({ message: `Error fetching dashboard stats: ${error}` });
    }
};

// Get all user types
export const getUserTypes = async (req, res) => {
    try {
        const userTypes = await UserType.find({ isActive: true });
        res.status(200).json(userTypes);
    } catch (error) {
        res.status(500).json({ message: `Error fetching user types: ${error}` });
    }
};

// Create new user type
export const createUserType = async (req, res) => {
    try {
        const { name, description, deliveryAllowed } = req.body;
        
        const existingUserType = await UserType.findOne({ name });
        if (existingUserType) {
            return res.status(400).json({ message: "User type already exists" });
        }
        
        const userType = await UserType.create({ name, description, deliveryAllowed });
        res.status(201).json(userType);
    } catch (error) {
        res.status(500).json({ message: `Error creating user type: ${error}` });
    }
};

// Update user type delivery permission
export const updateUserTypeDelivery = async (req, res) => {
    try {
        const { userTypeId } = req.params;
        const { deliveryAllowed } = req.body;
        
        const userType = await UserType.findByIdAndUpdate(
            userTypeId, 
            { deliveryAllowed }, 
            { new: true }
        );
        
        if (!userType) {
            return res.status(404).json({ message: "User type not found" });
        }
        
        // Update all users of this type
        await User.updateMany(
            { userType: userType.name },
            { deliveryAllowed }
        );
        
        res.status(200).json({ message: "User type delivery permission updated successfully", userType });
    } catch (error) {
        res.status(500).json({ message: `Error updating user type: ${error}` });
    }
};

// Delete user type
export const deleteUserType = async (req, res) => {
    try {
        const { userTypeId } = req.params;
        
        await UserType.findByIdAndUpdate(userTypeId, { isActive: false });
        res.status(200).json({ message: "User type deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: `Error deleting user type: ${error}` });
    }
};

// Clear all sample data
export const clearSampleData = async (req, res) => {
    try {
        // Delete all users except superadmin
        await User.deleteMany({ role: { $ne: "superadmin" } });
        
        // Clear categories except essential ones
        await Category.deleteMany({});
        
        // Clear user types
        await UserType.deleteMany({});
        
        res.status(200).json({ message: "Sample data cleared successfully" });
    } catch (error) {
        res.status(500).json({ message: `Error clearing sample data: ${error}` });
    }
};