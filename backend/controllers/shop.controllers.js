import Shop from "../models/shop.model.js";
import uploadToCloudinary from "../utils/s3Upload.js";

export const createEditShop=async (req,res) => {
    try {
       const {name,city,state,address, upiVpa, upiPayeeName}=req.body
       let image;
       if(req.file){
        console.log(req.file)
        image=await uploadToCloudinary(req.file)
       } 
       // Fallback: if Cloudinary isn't configured or upload failed, use a placeholder image
       const placeholderImage = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop";
       let shop=await Shop.findOne({owner:req.userId})
       if(!shop){
        // For new shop creation, ensure an image value exists
        if(!image){
            image = placeholderImage;
        }
        shop=await Shop.create({
        name,city,state,address,image,owner:req.userId,
        upiVpa: upiVpa || null,
        upiPayeeName: upiPayeeName || null
       })
       }else{
         // For shop update, only update image if new one is provided
         const updateData = {name,city,state,address,owner:req.userId,
            upiVpa: upiVpa ?? undefined,
            upiPayeeName: upiPayeeName ?? undefined
         }
         if(image){
             updateData.image = image
         }
         shop=await Shop.findByIdAndUpdate(shop._id,updateData,{new:true})
       }
      
       await shop.populate("owner items")
       return res.status(201).json(shop)
    } catch (error) {
        return res.status(500).json({message:`create shop error ${error}`})
    }
}

export const getMyShop=async (req,res) => {
    try {
        const shop=await Shop.findOne({owner:req.userId}).populate("owner").populate({
            path:"items",
            options:{sort:{updatedAt:-1}}
        })
        if(!shop){
            return res.status(200).json(null)
        }
        return res.status(200).json(shop)
    } catch (error) {
        return res.status(500).json({message:`get my shop error ${error}`})
    }
}

export const getAllShops = async (req, res) => {
    try {
        // Include image so frontend can render shop thumbnails in dashboard
        const shops = await Shop.find()
            .populate("owner", "name email")
            .select("name _id owner image")
        return res.status(200).json(shops)
    } catch (error) {
        return res.status(500).json({message: `get all shops error ${error}`})
    }
}

export const fixShopOwners = async (req, res) => {
    try {
        // Find shops with null owners
        const shopsWithoutOwners = await Shop.find({ owner: null })
        console.log(`Found ${shopsWithoutOwners.length} shops without owners:`, shopsWithoutOwners)
        
        if (shopsWithoutOwners.length > 0) {
            // Find a user to assign as owner (get the first available user)
            const User = (await import("../models/user.model.js")).default
            const availableUser = await User.findOne()
            
            if (availableUser) {
                // Update all shops without owners to have this user as owner
                const updateResult = await Shop.updateMany(
                    { owner: null },
                    { owner: availableUser._id }
                )
                
                return res.status(200).json({
                    message: `Fixed ${updateResult.modifiedCount} shops by assigning owner ${availableUser.email}`,
                    shopsFixed: updateResult.modifiedCount,
                    assignedOwner: availableUser.email
                })
            } else {
                return res.status(400).json({
                    message: "No users found to assign as shop owners"
                })
            }
        }
        
        return res.status(200).json({
            message: "No shops without owners found",
            shops: []
        })
    } catch (error) {
        return res.status(500).json({message: `fix shop owners error ${error}`})
    }
}

export const getShopByCity=async (req,res) => {
    try {
        const {city}=req.params

        const shops=await Shop.find({
            city:{$regex:new RegExp(`^${city}$`, "i")},
            isOpen: true  // Only return open shops
        }).populate('items')
        if(!shops){
            return res.status(400).json({message:"shops not found"})
        }
        return res.status(200).json(shops)
    } catch (error) {
        return res.status(500).json({message:`get shop by city error ${error}`})
    }
}

// Update shop open/closed status
export const updateShopStatus = async (req, res) => {
    try {
        const { isOpen } = req.body
        
        if (typeof isOpen !== 'boolean') {
            return res.status(400).json({ message: "isOpen must be a boolean value" })
        }
        
        const shop = await Shop.findOneAndUpdate(
            { owner: req.userId }, 
            { isOpen }, 
            { new: true }
        ).populate("owner")
        
        if (!shop) {
            return res.status(404).json({ message: "Shop not found" })
        }
        
        // Emit real-time update to all connected clients
        if (req.io) {
            req.io.emit('shopStatusUpdate', {
                shopId: shop._id,
                isOpen: shop.isOpen,
                shopName: shop.name,
                city: shop.city
            })
        }
        
        return res.status(200).json({ 
            message: `Shop ${isOpen ? 'opened' : 'closed'} successfully`, 
            shop 
        })
        
    } catch (error) {
        return res.status(500).json({ message: `update shop status error ${error}` })
    }
}