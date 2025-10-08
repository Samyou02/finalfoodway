import jwt from "jsonwebtoken"


const genToken = async (user) => {
    try {
        // user can be a user object or just an id
        let payload;
        if (typeof user === 'object' && user._id && user.role) {
            payload = { userId: user._id, role: user.role };
        } else {
            // fallback for old usage
            payload = { userId: user };
        }
        const secret = process.env.JWT_SECRET || 'dev-secret' // Fallback for local dev to avoid 500s
        const token = jwt.sign(payload, secret, { expiresIn: "7d" });
        return token;
    } catch (error) {
        console.log(error);
    }
}

export default genToken