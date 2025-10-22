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

// Comprehensive CORS Configuration
const envAllowed = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean)

// Development origins - all possible local development URLs
const developmentOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174", 
  "http://localhost:5175",
  "http://localhost:5180",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:5180"
]

// Production origins - all deployment URLs
const productionOrigins = [
  "https://finalfoodway.vercel.app",
  "https://finalfoodway.onrender.com",
  "https://www.finalfoodway.vercel.app",
  "https://finalfoodway-git-main.vercel.app",
  "https://finalfoodway-git-master.vercel.app"
]

// Combine all origins - always allow both development and production
const allAllowedOrigins = [...developmentOrigins, ...productionOrigins, ...envAllowed]

// Remove duplicates and filter out empty strings
const allowedOrigins = [...new Set(allAllowedOrigins)].filter(Boolean)
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
// Enhanced local development detection
const isLocalDev = (origin) => {
  if (!origin) return false
  try {
    const url = new URL(origin)
    const hostname = url.hostname
    const port = url.port
    
    // Check for localhost, 127.0.0.1, and common development patterns
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0'
    const isValidPort = port && parseInt(port) >= 3000 && parseInt(port) <= 9999
    
    return isLocalHost && (isValidPort || !port)
  } catch {
    return false
  }
}

// Enhanced Vercel deployment detection
const isVercelDeployment = (origin) => {
  if (!origin) return false
  try {
    const url = new URL(origin)
    return url.hostname.includes('vercel.app') || url.hostname.includes('finalfoodway')
  } catch {
    return false
  }
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) {
      console.log('CORS: Allowing request with no origin (mobile app/curl)')
      return callback(null, true)
    }
    
    // Check if origin is in our explicit allowed list
    if (allowedOrigins.includes(origin)) {
      console.log(`CORS: Allowing explicitly listed origin: ${origin}`)
      return callback(null, true)
    }
    
    // Check if it's a local development URL
    if (isLocalDev(origin)) {
      console.log(`CORS: Allowing local development origin: ${origin}`)
      return callback(null, true)
    }
    
    // Check if it's a Vercel deployment (for dynamic preview URLs)
    if (isVercelDeployment(origin)) {
      console.log(`CORS: Allowing Vercel deployment origin: ${origin}`)
      return callback(null, true)
    }
    
    // Log the rejected origin for debugging
    console.log(`CORS: REJECTED origin: ${origin}`)
    console.log(`CORS: Allowed origins:`, allowedOrigins.slice(0, 5), '...')
    
    return callback(new Error(`CORS policy violation: Origin ${origin} is not allowed`))
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

