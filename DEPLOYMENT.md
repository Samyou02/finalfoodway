# FOODWAY Backend Deployment Guide for Render

This guide will help you deploy your FOODWAY backend to Render for production.

## Prerequisites

1. **GitHub Repository**: Your code should be in a GitHub repository
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **MongoDB Atlas**: Set up a MongoDB Atlas cluster for production database
4. **Third-party Services**: Configure Cloudinary, Razorpay, and email services

## Step-by-Step Deployment

### 1. Prepare Your Repository

Ensure your repository contains:
- ✅ Updated `package.json` with Node.js version requirements
- ✅ `.env.example` file documenting required environment variables
- ✅ `render.yaml` configuration file
- ✅ Updated CORS configuration for production

### 2. Set Up MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster (free tier available)
3. Create a database user with read/write permissions
4. Whitelist IP addresses (use `0.0.0.0/0` for Render or specific IPs)
5. Get your connection string: `mongodb+srv://username:password@cluster.mongodb.net/foodway`

### 3. Configure Third-Party Services

#### Cloudinary (Image Storage)
1. Sign up at [Cloudinary](https://cloudinary.com)
2. Get your Cloud Name, API Key, and API Secret from the dashboard

#### Razorpay (Payments)
1. Sign up at [Razorpay](https://razorpay.com)
2. Get your Key ID and Key Secret from the dashboard
3. Configure webhooks if needed

#### Email Service (Gmail)
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password for your application
3. Use your Gmail address and the app password

### 4. Deploy to Render

#### Option A: Using render.yaml (Recommended)

1. **Connect Repository**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` file

2. **Configure Environment Variables**:
   Add these environment variables in Render dashboard:

   ```
   NODE_ENV=production
   MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/foodway
   JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
   EMAIL=your-email@gmail.com
   PASS=your-gmail-app-password
   USE_TEST_MAIL=0
   CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
   CLOUDINARY_API_KEY=your-cloudinary-api-key
   CLOUDINARY_API_SECRET=your-cloudinary-api-secret
   RAZORPAY_KEY_ID=your-razorpay-key-id
   RAZORPAY_KEY_SECRET=your-razorpay-key-secret
   ALLOWED_ORIGINS=https://your-frontend-domain.com
   ```

#### Option B: Manual Setup

1. **Create Web Service**:
   - Go to Render Dashboard
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select the `backend` folder as root directory

2. **Configure Build & Start**:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: `Node`

3. **Add Environment Variables** (same as above)

### 5. Configure Frontend CORS

Update your frontend to use the Render backend URL:
- Your backend will be available at: `https://your-service-name.onrender.com`
- Update your frontend API base URL to point to this domain
- Add your frontend domain to the `ALLOWED_ORIGINS` environment variable

### 6. Test Your Deployment

1. **Health Check**: Visit `https://your-service-name.onrender.com/` 
   - Should return: `{"message": "FOODWAY Backend API is running!", "status": "healthy"}`

2. **API Endpoints**: Test your API endpoints:
   - `GET /api/auth/test` (if available)
   - `GET /api/categories`
   - etc.

3. **Database Connection**: Check logs for successful MongoDB connection

## Important Security Notes

1. **Environment Variables**: Never commit `.env` files to your repository
2. **JWT Secret**: Use a strong, random secret (minimum 32 characters)
3. **Database**: Use MongoDB Atlas with proper authentication
4. **CORS**: Only allow your frontend domain in production
5. **API Keys**: Keep all third-party API keys secure

## Monitoring and Maintenance

1. **Logs**: Monitor your application logs in Render dashboard
2. **Health Checks**: Render automatically monitors your health check endpoint
3. **Auto-Deploy**: Enable auto-deploy for automatic updates when you push to GitHub
4. **Scaling**: Upgrade your plan if you need more resources

## Troubleshooting

### Common Issues:

1. **Build Fails**:
   - Check Node.js version compatibility
   - Ensure all dependencies are in `package.json`

2. **App Crashes**:
   - Check environment variables are set correctly
   - Verify MongoDB connection string
   - Check application logs

3. **CORS Errors**:
   - Ensure frontend domain is in `ALLOWED_ORIGINS`
   - Check that credentials are enabled

4. **Database Connection Issues**:
   - Verify MongoDB Atlas IP whitelist
   - Check connection string format
   - Ensure database user has proper permissions

## Support

- Render Documentation: [render.com/docs](https://render.com/docs)
- MongoDB Atlas Documentation: [docs.atlas.mongodb.com](https://docs.atlas.mongodb.com)

## Cost Optimization

- **Free Tier**: Render offers a free tier with limitations
- **Sleep Mode**: Free tier services sleep after 15 minutes of inactivity
- **Upgrade**: Consider upgrading to paid plans for production use
- **Database**: MongoDB Atlas free tier provides 512MB storage

---

**Note**: This deployment guide assumes you're using the free tiers of various services. For production applications with high traffic, consider upgrading to paid plans for better performance and reliability.