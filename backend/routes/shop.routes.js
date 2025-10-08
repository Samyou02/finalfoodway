import express from "express"
import { createEditShop, getMyShop, getShopByCity, getAllShops, fixShopOwners, updateShopStatus } from "../controllers/shop.controllers.js"
import isAuth from "../middlewares/isAuth.js"
import { upload } from "../middlewares/multer.js"

const shopRouter=express.Router()

// Protected routes
shopRouter.post("/create-edit",isAuth,upload.single("image"),createEditShop)
shopRouter.get("/get-my",isAuth,getMyShop)
shopRouter.put("/update-status",isAuth,updateShopStatus)

// Public routes
shopRouter.get("/get-by-city/:city",getShopByCity)
shopRouter.get("/get-all",getAllShops)
shopRouter.get("/fix-owners",fixShopOwners)

export default shopRouter