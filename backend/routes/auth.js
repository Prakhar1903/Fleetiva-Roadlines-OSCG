const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

let admin = null;
let db = null;

/* ================= SAFE FIREBASE LOAD ================= */
try {
  admin = require("firebase-admin");

  // Firebase only usable if initialized in server.js
  if (admin.apps.length > 0) {
    db = admin.firestore();
    console.log("✅ Firebase available in auth routes");
  } else {
    console.warn("⚠️ Firebase not initialized — auth routes running in safe mode");
  }
} catch (err) {
  console.warn("⚠️ Firebase package not found — running without Firebase");
}

const router = express.Router();

/* ================= HELPER ================= */
function firebaseDisabled(res) {
  return res.status(503).json({
    message: "Firebase authentication disabled in production",
  });
}

/* ================= GOOGLE LOGIN ================= */
router.post("/google", async (req, res) => {
  if (!admin || admin.apps.length === 0) return firebaseDisabled(res);

  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ message: "Missing Google token" });

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

      await db.collection("users").doc(user._id.toString()).set({
        name: user.name,
        email: user.email,
        role: user.role,
        authProvider: user.authProvider,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isVerified: false,
      });
    }

    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ accessToken });
  } catch (err) {
    console.error("❌ Google login error:", err);
    res.status(401).json({ message: "Invalid Google token" });
  }
});

/* ================= FIREBASE LOGIN ================= */
router.post("/firebase/login", async (req, res) => {
  if (!admin || admin.apps.length === 0) return firebaseDisabled(res);

  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: "Firebase ID token required" });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, email_verified } = decoded;

    let user = await User.findOne({
      $or: [{ firebaseUid: uid }, { email }],
    });

    if (!user) {
      user = await User.create({
        name: name || email.split("@")[0],
        email,
        firebaseUid: uid,
        authProvider: "firebase",
        role: "customer",
        isVerified: email_verified || false,
      });

      await db.collection("users").doc(user._id.toString()).set({
        name: user.name,
        email: user.email,
        role: user.role,
        authProvider: user.authProvider,
        firebaseUid: user.firebaseUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isVerified: user.isVerified,
      });
    }

    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ accessToken, user });
  } catch (err) {
    console.error("❌ Firebase login error:", err);
    res.status(401).json({ message: "Firebase authentication failed" });
  }
});

/* ================= PROFILE UPDATE ================= */
router.put("/profile", require("../middleware/combinedAuth").authenticate, async (req, res) => {
  if (!admin || admin.apps.length === 0) return firebaseDisabled(res);

  try {
    const userId = req.user.userId;
    const { name, phone, companyName } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { name, phone, companyName },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    await db.collection("users").doc(userId.toString()).update({
      name: user.name,
      phone: user.phone,
      companyName: user.companyName,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ user });
  } catch (err) {
    console.error("❌ Profile update error:", err);
    res.status(500).json({ message: "Profile update failed" });
  }
});

module.exports = router;
