import express from "express"
import dotenv from "dotenv"
dotenv.config()
import connectDb from "./config/db.js"
import cookieParser from "cookie-parser"
import authRouter from "./routes/auth.routes.js"
import cors from "cors"
import userRouter from "./routes/user.routes.js"
import superadminRouter from "./routes/superadmin.routes.js"
import itemRouter from "./routes/item.routes.js"
import shopRouter from "./routes/shop.routes.js"
import orderRouter from "./routes/order.routes.js"
import categoryRouter from "./routes/category.routes.js"
import http from "http"
import { Server } from "socket.io"
import { socketHandler } from "./socket.js"
import cron from "node-cron"
import { autoRegenerateOtps } from "./controllers/order.controllers.js"

const app=express()
const server=http.createServer(app)

const allowedOrigins = ["http://localhost:5173", "http://localhost:5174"]
const io=new Server(server,{
   cors:{
    origin: allowedOrigins,
    credentials:true,
    methods:['POST','GET']
}
})

app.set("io",io)

// Middleware to attach socket.io to request object
app.use((req, res, next) => {
    req.io = io
    next()
})

const port=process.env.PORT || 5000
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true)
        if (allowedOrigins.includes(origin)) {
            return callback(null, true)
        }
        return callback(new Error('Not allowed by CORS'))
    },
    credentials:true
}))
app.use(express.json())
app.use(cookieParser())
app.use("/api/auth",authRouter)
app.use("/api/user",userRouter)
app.use("/api/superadmin",superadminRouter)
app.use("/api/shop",shopRouter)
app.use("/api/item",itemRouter)
app.use("/api/order",orderRouter)
app.use("/api/categories",categoryRouter)

socketHandler(io)

// Schedule OTP regeneration every 2 hours
cron.schedule('0 */2 * * *', () => {
    console.log('Running automatic OTP regeneration...')
    autoRegenerateOtps()
})

server.listen(port,()=>{
    connectDb()
    console.log(`server started at ${port}`)
})

