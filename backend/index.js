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
import ratingRouter from "./routes/rating.routes.js"
import http from "http"
import { Server } from "socket.io"
import { socketHandler } from "./socket.js"
import cron from "node-cron"
import { autoRegenerateOtps } from "./controllers/order.controllers.js"

const app=express()
const server=http.createServer(app)

// CORS Configuration for production and development
const envAllowed = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean)

// Always include development origins for local development
const developmentOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5180",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:5180"
]

const productionOrigins = [
  "https://finalfoodway.vercel.app",
  "https://finalfoodway.onrender.com"
]

// Combine all allowed origins
const defaultAllowed = process.env.NODE_ENV === 'production' 
  ? [...productionOrigins, ...developmentOrigins] // Allow both in production for flexibility
  : [...developmentOrigins, ...productionOrigins] // Allow both in development

const allowedOrigins = envAllowed.length ? [...envAllowed, ...developmentOrigins] : defaultAllowed
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
const isLocalDev = (o) => {
  try {
    return /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(o)
  } catch {
    return false
  }
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true)
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    
    // Check if it's a local development URL
    if (isLocalDev(origin)) {
      return callback(null, true)
    }
    
    // Log the rejected origin for debugging
    console.log(`CORS: Rejected origin: ${origin}`)
    console.log(`CORS: Allowed origins:`, allowedOrigins)
    
    return callback(new Error(`Not allowed by CORS: ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-HTTP-Method-Override'
  ],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}))
app.use(express.json())
app.use(cookieParser())

// Handle preflight requests explicitly
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, X-HTTP-Method-Override')
    res.header('Access-Control-Allow-Credentials', 'true')
    return res.sendStatus(200)
  }
  next()
})

// Health check endpoint for Render
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'FOODWAY Backend API is running!', 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

app.use("/api/auth",authRouter)
app.use("/api/user",userRouter)
app.use("/api/superadmin",superadminRouter)
app.use("/api/shop",shopRouter)
app.use("/api/item",itemRouter)
app.use("/api/order",orderRouter)
app.use("/api/categories",categoryRouter)
app.use("/api/rating",ratingRouter)

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

