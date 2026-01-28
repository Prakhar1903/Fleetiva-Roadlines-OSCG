const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const admin = require("firebase-admin");
const User = require("../models/User");

const router = express.Router();

/* ================= REGISTER (OTP DISABLED) ================= */
router.post("/register", async (req, res) => {
  try {
    const { name, phone, password, role, companyName } = req.body;

    const exists = await User.findOne({ phone });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      phone,
      password: hashed,
      role,
      companyName,
      isVerified: true, // OTP disabled
      provider: "local",
    });

    res.json({ message: "Registered successfully" });
  } catch (err) {
  console.error("❌ REGISTER ERROR:", err);
  res.status(500).json({
    message: "Registration failed",
    error: err.message,
    stack: err.stack,
  });
}
});

/* ================= LOGIN ================= */
router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;

    const user = await User.findOne({ phone });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ accessToken: token });
  } catch (err) {
    res.status(500).json({ message: "Login failed" });
  }
});

/* ================= GOOGLE LOGIN ================= */
router.post("/google", async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: "Missing Google token" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);

    const { email, name, uid } = decoded;

    let user = await User.findOne({ googleId: uid });

    if (!user) {
      user = await User.create({
        name,
        email,
        googleId: uid,
        role: "customer",
        authProvider: "google",
      });
    }

    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ accessToken });
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Invalid Google token" });
  }
});

module.exports = router;
