const { cert, getApps, initializeApp, applicationDefault } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

function credential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  }
  return applicationDefault();
}

function getFirebaseAuth() {
  if (!getApps().length) {
    initializeApp({
      credential: credential(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }
  return getAuth();
}

module.exports = { getFirebaseAuth };
