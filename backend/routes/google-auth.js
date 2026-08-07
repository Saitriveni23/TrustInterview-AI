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

module.exports = router;
