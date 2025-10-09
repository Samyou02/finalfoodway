import express from "express"
import { submitRating, getMyDeliveryRatings, getMyShopRatings, getUserOrderRatings } from "../controllers/rating.controllers.js"
import isAuth from "../middlewares/isAuth.js"

const router = express.Router()

// Protected routes for ratings
router.post("/submit", isAuth, submitRating)
router.get("/delivery/my", isAuth, getMyDeliveryRatings)
router.get("/shop/my", isAuth, getMyShopRatings)
router.get("/order/:orderId", isAuth, getUserOrderRatings)

export default router