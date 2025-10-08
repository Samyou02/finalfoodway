import express from "express"
import { addItem, deleteItem, editItem, getItemsInCity, getItemById, getItemsByShop, rating, searchItems, updateStockStatus } from "../controllers/item.controllers.js"
import isAuth from "../middlewares/isAuth.js"

import { upload } from "../middlewares/multer.js"

const itemRouter=express.Router()

// Protected routes (require authentication)
itemRouter.post("/add-item",isAuth,upload.single("image"),addItem)
itemRouter.post("/edit-item/:itemId",isAuth,upload.single("image"),editItem)
itemRouter.get("/get-by-id/:itemId",isAuth,getItemById)
itemRouter.get("/delete/:itemId",isAuth,deleteItem)
itemRouter.post("/rating",isAuth,rating)
itemRouter.put("/update-stock/:itemId",isAuth,updateStockStatus)

// Public routes (accessible without authentication)
itemRouter.get("/get-by-city/:city",getItemsInCity)
itemRouter.get("/get-by-shop/:shopId",getItemsByShop)
itemRouter.get("/search-items",searchItems)
export default itemRouter