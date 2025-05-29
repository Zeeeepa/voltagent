const express = require('express');
const app = express();

// Unprotected admin route - should be flagged
app.get('/admin/users', (req, res) => {
  res.json({ users: getAllUsers() });
});

// Unprotected API route - should be flagged
app.post('/api/delete-user', (req, res) => {
  deleteUser(req.body.userId);
  res.json({ success: true });
});

// Hardcoded secret - should be flagged
const API_KEY = "sk-1234567890abcdef";
const password = "hardcoded_password_123";

// Weak role check - should be flagged
function checkAdmin(req, res, next) {
  if (req.user.role === "admin") {
    next();
  } else {
    res.status(403).send('Forbidden');
  }
}

// Protected route - should be OK
app.get('/admin/settings', authenticateToken, requireAdmin, (req, res) => {
  res.json({ settings: getSettings() });
});

module.exports = app;

