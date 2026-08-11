// ============================================================
// config/passport.js
// Google OAuth 2.0 Strategy Configuration
// ============================================================

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// In-memory user store (replace with database in production)
const users = new Map();

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = users.get(id);
  done(null, user);
});

if (process.env.GOOGLE_CLIENT_ID) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5001/api/auth/google/callback',
      },
      (accessToken, refreshToken, profile, done) => {
        let user = users.get(profile.id);
        if (!user) {
          user = {
            id: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            picture: profile.photos[0]?.value,
            createdAt: Date.now(),
          };
          users.set(profile.id, user);
          console.log('[Google Auth] New user registered:', user.email);
        } else {
          console.log('[Google Auth] Existing user logged in:', user.email);
        }
        return done(null, user);
      }
    )
  );
} else {
  console.warn('[Google Auth] GOOGLE_CLIENT_ID not set — OAuth disabled. Mock auth will be used.');
}

module.exports = { passport, users };
