# Google OAuth 2.0 Authentication Setup Guide

## Overview
This guide will help you set up Google OAuth authentication for the TrustInterview AI application.

## Prerequisites
- A Google account
- Access to Google Cloud Console

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "TrustInterview AI")
5. Click "Create"

## Step 2: Enable Google+ API

1. In your Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click on it and click "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type (or "Internal" if you have a Google Workspace)
3. Click "Create"
4. Fill in the required fields:
   - **App name**: TrustInterview AI
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click "Save and Continue"
6. On the "Scopes" page, click "Add or Remove Scopes"
7. Add these scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
8. Click "Save and Continue"
9. Add test users if needed (for development)
10. Click "Save and Continue" and then "Back to Dashboard"

## Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application"
4. Configure:
   - **Name**: TrustInterview AI Web Client
   - **Authorized JavaScript origins**: 
     - `http://localhost:5001`
     - `http://localhost:3000`
   - **Authorized redirect URIs**:
     - `http://localhost:5001/api/auth/google/callback`
5. Click "Create"
6. **Copy your Client ID and Client Secret** - you'll need these!

## Step 5: Update Environment Variables

1. Open `backend/.env` file
2. Update the following values with your credentials:

```env
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback
```

## Step 6: Restart the Backend Server

```bash
cd backend
npm start
```

## Step 7: Test the Integration

1. Open the application at http://localhost:3000
2. Click the "Continue with Google" button
3. Sign in with your Google account
4. You should be redirected back to the application with authentication complete

## API Endpoints

### Initiate Google OAuth
```
GET /api/auth/google
```
Redirects user to Google's consent screen

### OAuth Callback
```
GET /api/auth/google/callback
```
Handles the redirect from Google after authentication

### Get Current User
```
GET /api/auth/me
Authorization: Bearer <token>
```
Returns current authenticated user information

### Logout
```
POST /api/auth/logout
Authorization: Bearer <token>
```
Logs out the current user

## Security Notes

1. **Never commit** your `.env` file to version control
2. For production:
   - Update the authorized origins and redirect URIs with your production domain
   - Use HTTPS for all OAuth endpoints
   - Consider using a database instead of in-memory session storage
3. The OAuth consent screen will show a warning until you verify your app with Google
4. Implement proper token refresh logic for long-lived sessions

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Make sure the redirect URI in Google Cloud Console exactly matches the one in your `.env` file
- Include the protocol (`http://` or `https://`)

### Error: "access_denied"
- Check that the user is authorized (add them as a test user if in development mode)
- Verify the OAuth consent screen is properly configured

### User data not persisting
- Currently using in-memory storage, which clears on server restart
- For production, integrate with a database (MongoDB, PostgreSQL, etc.)

## Production Deployment

For production deployment:

1. Update `.env` with production URLs:
```env
FRONTEND_URL=https://yourdomain.com
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
```

2. Update Google Cloud Console:
   - Add production domain to authorized origins
   - Add production callback URL to authorized redirect URIs

3. Complete app verification process in Google Cloud Console

4. Implement proper session storage (Redis, database, etc.)

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Passport.js Google Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)
- [Google Cloud Console](https://console.cloud.google.com/)
