import jwt from "jsonwebtoken"
import User from "../models/user.model.js"

const isAuth = async (req, res, next) => {
    try {
        // Prefer cookie, but allow Authorization: Bearer <token> fallback
        let token = req.cookies?.token
        if (!token && req.headers?.authorization) {
            const parts = req.headers.authorization.split(' ')
            if (parts.length === 2 && parts[0] === 'Bearer') {
                token = parts[1]
            }
        }

        if (!token) {
            return res.status(401).json({ message: "Token not found" })
        }

        // Use same fallback as token generation to avoid dev-time mismatch
        const secret = process.env.JWT_SECRET || 'dev-secret'
        const decoded = jwt.verify(token, secret)

        // Get user data including role
        const user = await User.findById(decoded.userId).select('-password')
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        req.userId = decoded.userId
        req.user = user
        next()
    } catch (error) {
        // Provide clearer error reasons to aid debugging
        if (error?.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Token expired" })
        }
        if (error?.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: "Invalid token" })
        }
        return res.status(401).json({ message: "Authentication error" })
    }
}

export default isAuth