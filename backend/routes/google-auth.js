// ============================================================
// routes/google-auth.js
// Google OAuth 2.0 Authentication Routes
// ============================================================

const express = require('express');
const router = express.Router();
const { passport } = require('../config/passport');
const { generateSession } = require('../middleware/zta-identity');

// Initiate Google OAuth flow
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: process.env.FRONTEND_URL || 'http://localhost:3000',
    session: false 
  }),
  (req, res) => {
    // Generate ZTA session token for the authenticated user
    const { token, expiresAt } = generateSession();
    
    // Store user info in the session (you might want to enhance this)
    const userData = {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      picture: req.user.picture,
    };
    
    console.log('[Google Auth] User authenticated:', userData.email);
    
    // Redirect to frontend with token and user data
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`;
    
    res.redirect(redirectUrl);
  }
);

// Get current user info (protected route)
router.get('/me', (req, res) => {
  if (!req.ztaSession) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // In production, fetch user from database using session
  res.json({
    success: true,
    user: req.user || { authenticated: true }
  });
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
});

const fs = require('fs');
const path = require('path');
const USERS_PATH = path.join(__dirname, '../registered-users.json');

function loadUsers() {
  if (!fs.existsSync(USERS_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), 'utf-8');
}

// Sync registered/logged-in users with backend
router.post('/register-sync', (req, res) => {
  try {
    const { name, email, role } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }
    const cleanEmail = email.toLowerCase().trim();
    const users = loadUsers();
    
    let user = users.find(u => u.email === cleanEmail);
    if (!user) {
      user = {
        name: name.trim(),
        email: cleanEmail,
        role: role || 'candidate',
        registeredAt: new Date().toISOString()
      };
      users.push(user);
      saveUsers(users);
      console.log(`[Sync] Synced user to backend: ${cleanEmail}`);
    } else {
      // update name if needed
      user.name = name.trim();
      user.role = role || user.role;
      saveUsers(users);
    }
    res.json({ success: true, user });
  } catch (err) {
    console.error('[Sync Error]', err.message);
    res.status(500).json({ error: 'Failed to sync registration.' });
  }
});

// Fetch list of registered users
router.get('/registered-users', (req, res) => {
  try {
    const users = loadUsers();
    res.json({ success: true, users });
  } catch (err) {
    console.error('[Get Users Error]', err.message);
    res.status(500).json({ error: 'Failed to fetch registered users.' });
  }
});

module.exports = router;
