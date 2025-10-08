import Item from "../models/item.model.js";
import Shop from "../models/shop.model.js";
import uploadToCloudinary from "../utils/s3Upload.js";

export const addItem = async (req, res) => {
    try {
        const { name, category, foodType, price, preparationTime, stockStatus } = req.body
        
        // Validate required fields
        if (!name || !category || !foodType || !price) {
            return res.status(400).json({ message: "All fields (name, category, foodType, price) are required" })
        }

        let image;
        if (req.file) {
            try {
                image = await uploadToCloudinary(req.file)
            } catch (uploadError) {
                console.error('Image upload error:', uploadError)
                return res.status(400).json({ message: "Failed to upload image. Please try again." })
            }
        }
        
        const shop = await Shop.findOne({ owner: req.userId })
        if (!shop) {
            return res.status(400).json({ message: "Shop not found. Please create a shop first." })
        }
        
        const item = await Item.create({
            name, 
            category, 
            foodType, 
            price, 
            image, 
            shop: shop._id,
            preparationTime: preparationTime || 15,
            stockStatus: stockStatus || "in_stock",
            city: shop.city,
            state: shop.state
        })

        shop.items.push(item._id)
        await shop.save()
        await shop.populate("owner")
        await shop.populate({
            path: "items",
            options: { sort: { updatedAt: -1 } }
        })
        return res.status(201).json(shop)

    } catch (error) {
        console.error('Add item error:', error)
        
        // Handle specific MongoDB errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0]
            return res.status(400).json({ message: `An item with this ${field} already exists` })
        }
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message)
            return res.status(400).json({ message: messages.join(', ') })
        }
        
        // Handle cast errors (invalid ObjectId, etc.)
        if (error.name === 'CastError') {
            return res.status(400).json({ message: "Invalid data format provided" })
        }
        
        return res.status(500).json({ message: "Internal server error. Please try again later." })
    }
}

export const editItem = async (req, res) => {
    try {
        const itemId = req.params.itemId
        const { name, category, foodType, price, preparationTime, stockStatus } = req.body
        let image;
        if (req.file) {
            image = await uploadToCloudinary(req.file)
        }
        
        const updateData = {
            name, 
            category, 
            foodType, 
            price
        }
        
        if (image) updateData.image = image
        if (preparationTime) updateData.preparationTime = preparationTime
        if (stockStatus) updateData.stockStatus = stockStatus
        
        const item = await Item.findByIdAndUpdate(itemId, updateData, { new: true })
        if (!item) {
            return res.status(400).json({ message: "item not found" })
        }
        const shop = await Shop.findOne({ owner: req.userId }).populate({
            path: "items",
            options: { sort: { updatedAt: -1 } }
        })
        return res.status(200).json(shop)

    } catch (error) {
        return res.status(500).json({ message: `edit item error ${error}` })
    }
}

export const getItemById = async (req, res) => {
    try {
        const itemId = req.params.itemId
        const item = await Item.findById(itemId)
        if (!item) {
            return res.status(400).json({ message: "item not found" })
        }
        return res.status(200).json(item)
    } catch (error) {
        return res.status(500).json({ message: `get item error ${error}` })
    }
}

export const deleteItem = async (req, res) => {
    try {
        const itemId = req.params.itemId
        const item = await Item.findByIdAndDelete(itemId)
        if (!item) {
            return res.status(400).json({ message: "item not found" })
        }
        const shop = await Shop.findOne({ owner: req.userId })
        shop.items = shop.items.filter(i => i !== item._id)
        await shop.save()
        await shop.populate({
            path: "items",
            options: { sort: { updatedAt: -1 } }
        })
        return res.status(200).json(shop)

    } catch (error) {
        return res.status(500).json({ message: `delete item error ${error}` })
    }
}

export const getItemsInCity = async (req, res) => {
    try {
        const { city } = req.params
        const { sortBy, filterBy, priceRange, category, foodType, prepTime, stockStatus } = req.query
        
        if (!city) {
            return res.status(400).json({ message: "city is required" })
        }
        
        // Build filter query
        let filterQuery = { city: { $regex: new RegExp(`^${city}$`, "i") } }
        
        // Apply filters
        if (category && category !== "All") {
            filterQuery.category = { $regex: new RegExp(`^${category}$`, "i") }
        }
        
        if (foodType && foodType !== "all" && foodType !== "All") {
            filterQuery.foodType = foodType
        }
        
        if (stockStatus && stockStatus !== "all") {
            if (stockStatus === "available") {
                filterQuery.stockStatus = { $in: ["in_stock", "limited"] }
            } else {
                filterQuery.stockStatus = stockStatus
            }
        }
        
        if (prepTime) {
            switch (prepTime) {
                case "under_10":
                    filterQuery.preparationTime = { $lt: 10 }
                    break
                case "10_20":
                    filterQuery.preparationTime = { $gte: 10, $lte: 20 }
                    break
                case "over_20":
                    filterQuery.preparationTime = { $gt: 20 }
                    break
            }
        }
        
        if (priceRange) {
            const [min, max] = priceRange.split('-').map(Number)
            if (min && max) {
                filterQuery.price = { $gte: min, $lte: max }
            }
        }
        
        // Build sort query
        let sortQuery = {}
        switch (sortBy) {
            case "price_low":
                sortQuery.price = 1
                break
            case "price_high":
                sortQuery.price = -1
                break
            case "prep_time":
                sortQuery.preparationTime = 1
                break
            case "popularity":
                sortQuery.popularity = -1
                break
            case "rating":
                sortQuery["rating.average"] = -1
                break
            case "newest":
                sortQuery.createdAt = -1
                break
            case "available_first":
                sortQuery.stockStatus = 1
                break
            default:
                sortQuery.createdAt = -1
        }
        
        const items = await Item.find(filterQuery)
            .populate({
                path: "shop", 
                select: "name image isOpen"
            })
            .sort(sortQuery)
        
        // Return all items including those from closed shops and out of stock items
        // The frontend will handle displaying them appropriately
        return res.status(200).json(items)
        
    } catch (error) {
        return res.status(500).json({ message: `get items in city error ${error}` })
    }
}

export const getItemsByShop=async (req,res) => {
    try {
        const {shopId}=req.params
        const shop=await Shop.findById(shopId).populate("items")
        if(!shop){
            return res.status(400).json("shop not found")
        }
        return res.status(200).json({
            shop,items:shop.items
        })
    } catch (error) {
         return res.status(500).json({ message: `get item by shop error ${error}` })
    }
}

export const searchItems=async (req,res) => {
    try {
        const {query,city}=req.query
        if(!query || !city){
            return null
        }
        const shops=await Shop.find({
            city:{$regex:new RegExp(`^${city}$`, "i")},
            isOpen: true  // Only search in open shops
        }).populate('items')
        if(!shops){
            return res.status(400).json({message:"shops not found"})
        }
        const shopIds=shops.map(s=>s._id)
        const items=await Item.find({
            shop:{$in:shopIds},
            $or:[
              {name:{$regex:query,$options:"i"}},
              {category:{$regex:query,$options:"i"}}  
            ]

        }).populate("shop","name image isOpen")

        return res.status(200).json(items)

    } catch (error) {
         return res.status(500).json({ message: `search item  error ${error}` })
    }
}

// Update stock status endpoint
export const updateStockStatus = async (req, res) => {
    try {
        const { itemId } = req.params
        const { stockStatus } = req.body
        
        if (!stockStatus || !["in_stock", "out_of_stock", "limited"].includes(stockStatus)) {
            return res.status(400).json({ message: "Valid stock status is required" })
        }
        
        const item = await Item.findByIdAndUpdate(
            itemId, 
            { stockStatus }, 
            { new: true }
        ).populate("shop", "name")
        
        if (!item) {
            return res.status(404).json({ message: "Item not found" })
        }
        
        // Emit real-time update to all connected clients
        if (req.io) {
            req.io.emit('stockStatusUpdate', {
                itemId: item._id,
                stockStatus: item.stockStatus,
                itemName: item.name,
                shopName: item.shop.name
            })
        }
        
        return res.status(200).json({ 
            message: "Stock status updated successfully", 
            item 
        })
        
    } catch (error) {
        return res.status(500).json({ message: `update stock status error ${error}` })
    }
}


export const rating=async (req,res) => {
    try {
        const {itemId,rating}=req.body

        if(!itemId || !rating){
            return res.status(400).json({message:"itemId and rating is required"})
        }

        if(rating<1 || rating>5){
             return res.status(400).json({message:"rating must be between 1 to 5"})
        }

        const item=await Item.findById(itemId)
        if(!item){
              return res.status(400).json({message:"item not found"})
        }

        const newCount=item.rating.count + 1
        const newAverage=(item.rating.average*item.rating.count + rating)/newCount

        item.rating.count=newCount
        item.rating.average=newAverage
        await item.save()
return res.status(200).json({rating:item.rating})

    } catch (error) {
         return res.status(500).json({ message: `rating error ${error}` })
    }
}