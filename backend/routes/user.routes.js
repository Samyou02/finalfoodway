import express from "express"
import { getCurrentUser, updateUserLocation, updateActiveStatus } from "../controllers/user.controllers.js"
import isAuth from "../middlewares/isAuth.js"


const userRouter=express.Router()

userRouter.get("/current",isAuth,getCurrentUser)
userRouter.post('/update-location',isAuth,updateUserLocation)
userRouter.put('/set-active',isAuth,updateActiveStatus)
export default userRouter