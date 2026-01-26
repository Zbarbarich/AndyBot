import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';
import queries from '../queries/userQueries';
import bcrypt from 'bcrypt';
import { AuthRequest } from '../middleware/authMiddleware';

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface User {
  userID: number;
  userName: string;
  email: string;
  role: string;
  password: string;
}

const generateJWT = (user: { email: string; role: string; userID: number }): string => {
  return jwt.sign(
    {
      email: user.email,
      role: user.role,
      userID: user.userID,
    },
    process.env.JWT_SECRET as string,
    {
      expiresIn: "1h",
      algorithm: "HS256",
    }
  );
};

const isAdmin = async (email: string): Promise<boolean> => {
  try {
    const result = await pool.query(queries.checkRole, [email]);
    return result.rows[0]?.role === "admin";
  } catch (error) {
    console.error("Error checking admin status");
    return false;
  }
};

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    try {
      const results = await pool.query(queries.login, [email]);

      if (results.rows.length === 1) {
        const user: User = results.rows[0];

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          res.status(401).json({ error: "invalid credentials" });
          return;
        }

        const token = generateJWT({
          email: user.email,
          role: user.role,
          userID: user.userID,
        });

        const response = {
          token,
          success: true,
          user: {
            userName: user.userName,
            email: user.email,
            role: user.role,
            userID: user.userID,
          },
        };
        res.status(200).json(response);
      } else {
        res.status(401).json({ error: "invalid credentials" });
      }
    } catch (error: any) {
      console.error("Login error");
      res.status(500).json({
        error: "Server error",
      });
    }
  },

  async getAllUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userEmail = req.user?.email;
      if (!userEmail) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!(await isAdmin(userEmail))) {
        res.status(403).json({ error: "Admin access required" });
        return;
      }
      const result = await pool.query(queries.getAllUsers);
      res.json(result.rows);
    } catch (error: any) {
      console.error("Error in getAllUsers");
      res.status(500).json({ error: "Server error" });
    }
  },

  async createUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userName, password, email, role } = req.body;

      // Check if this is the first user (allows creation without auth)
      const userCount = await pool.query('SELECT COUNT(*) FROM "users"');
      const isFirstUser = userCount.rows[0].count === "0";

      // If not the first user, require authentication and admin role
      if (!isFirstUser) {
        if (!req.user) {
          res.status(401).json({ error: "Authentication required" });
          return;
        }
        if (!(await isAdmin(req.user.email))) {
          res.status(403).json({ error: "Admin access required" });
          return;
        }
      }

      // Validate role - must be 'admin' or 'tech'
      if (role !== "admin" && role !== "tech") {
        res.status(400).json({
          error: "Role must be either 'admin' or 'tech'",
        });
        return;
      }

      // Validate required fields
      if (!userName || !password || !email || !role) {
        res.status(400).json({ error: "All fields are required" });
        return;
      }

      // Check if email already exists
      const checkEmail = await pool.query(queries.checkEmail, [email]);
      if (checkEmail.rows.length > 0) {
        res.status(400).json({ error: "Email already exists" });
        return;
      }

      // Hash password with bcrypt
      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await pool.query(queries.createUser, [
        userName,
        hashedPassword,
        email,
        role,
      ]);

      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      console.error("Create user error");
      if (error.code === "23505") {
        res.status(400).json({ error: "Email already exists" });
      } else {
        res.status(500).json({ error: "Server error" });
      }
    }
  },

  async validateUser(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      const result = await pool.query(queries.validateUser, [email]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  },

  async deleteUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user && !(await isAdmin(req.user.email))) {
        res.status(403).json({ error: "Admin access required" });
        return;
      }

      const { id } = req.params;
      const result = await pool.query(queries.deleteUser, [id]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: "Server error", details: error.message });
    }
  },

  async updateUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user && !(await isAdmin(req.user.email))) {
        res.status(403).json({ error: "Admin access required" });
        return;
      }

      const { id } = req.params;
      const { userName, password, email, role } = req.body;

      // Build update query dynamically based on provided fields
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (userName) {
        updateFields.push(`"userName" = $${paramCount}`);
        values.push(userName);
        paramCount++;
      }
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateFields.push(`"password" = $${paramCount}`);
        values.push(hashedPassword);
        paramCount++;
      }
      if (email) {
        updateFields.push(`"email" = $${paramCount}`);
        values.push(email);
        paramCount++;
      }
      if (role) {
        updateFields.push(`"role" = $${paramCount}`);
        values.push(role);
        paramCount++;
      }

      if (updateFields.length === 0) {
        res.status(400).json({ error: "No fields to update" });
        return;
      }

      // Add the ID as the last parameter
      values.push(id);

      const updateQuery = queries.updateUserBase
        .replace("%s", updateFields.join(", "))
        .replace("%i", paramCount.toString());
      const result = await pool.query(updateQuery, values);

      if (result.rows.length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json(result.rows[0]);
    } catch (error: any) {
      console.error("Update user error");
      if (error.code === "23505") {
        res.status(400).json({ error: "Email already exists" });
      } else {
        res.status(500).json({ error: "Server error" });
      }
    }
  },
};

export default authController;
