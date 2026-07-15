import express, { Router } from "express";
import authController from "../controllers/authController";
import { verifyUserContext, optionalVerifyUserContext, isAdmin } from "../middleware/authMiddleware";

const router: Router = express.Router();

// Add logging middleware
router.use((req, res, next) => {
  console.log("Auth service received request:", req.method, req.path);
  next();
});

// Public auth routes
router.post("/login", authController.login);
router.post("/validate", verifyUserContext, authController.validateUser);
router.get("/me/preferences", verifyUserContext, authController.getMyPreferences);
router.patch("/me/preferences", verifyUserContext, authController.patchMyPreferences);

// Protected user management routes
router.get("/users", verifyUserContext, isAdmin, authController.getAllUsers);
// Allow first user creation without auth; subsequent users require admin (optionalVerify sets req.user when token present)
router.post("/users", optionalVerifyUserContext, authController.createUser);
router.put("/users/:id", verifyUserContext, isAdmin, authController.updateUser);
router.delete("/users/:id", verifyUserContext, authController.deleteUser);

export default router;
