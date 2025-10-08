import express from "express";
import { getCategories } from "../controllers/superadmin.controllers.js";

const router = express.Router();

// Public category routes (accessible by all users)
router.get("/", getCategories);

export default router;