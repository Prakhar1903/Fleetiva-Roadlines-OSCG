const jwt = require("jsonwebtoken");
const User = require("../models/User");

let admin = null;

/* ================= SAFE FIREBASE LOAD ================= */
try {
  admin = require("firebase-admin");

  // Firebase only usable if initialized in server.js
  if (admin.apps.length === 0) {
    console.warn("⚠️ Firebase not initialized — combinedAuth running in JWT-only mode");
  }
} catch (err) {
  console.warn("⚠️ Firebase package not found — combinedAuth running in JWT-only mode");
}

exports.authenticate = async (req, res, next) => {
  try {
    // First, try JWT verification
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];

    // Support token in query for PDF downloads via window.open
    if (!token && req.query.token) {
      token = req.query.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decoded.userId);
        if (user) {
          req.user = { userId: user._id, role: user.role, email: user.email, name: user.name };
          return next();
        }
      } catch (jwtErr) {
        console.warn("JWT verification failed, trying Firebase:", jwtErr.message);
      }
    }

    // If JWT failed or not present, try Firebase
    if (admin && admin.apps.length > 0) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const idToken = authHeader.split('Bearer ')[1];
        if (idToken) {
          try {
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const user = await User.findOne({ firebaseUid: decodedToken.uid });
            if (user) {
              req.user = { userId: user._id, role: user.role, email: user.email, name: user.name };
              return next();
            }
          } catch (firebaseErr) {
            console.warn("Firebase verification failed:", firebaseErr.message);
          }
        }
      }
    }

    // If both failed
    return res.status(401).json({ message: "Unauthorized" });
  } catch (err) {
    console.error("Authentication error:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

exports.authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Unauthorized Role" });
    }
    next();
  };
};
