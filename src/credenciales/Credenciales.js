import Constants from "expo-constants";

const ENV = Constants.expoConfig.extra;

// --- FIREBASE CONFIG ---
export const firebaseConfig = {
  apiKey: ENV.FIREBASE_API_KEY,
  authDomain: ENV.FIREBASE_AUTH_DOMAIN,
  projectId: ENV.FIREBASE_PROJECT_ID,
  storageBucket: ENV.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: ENV.FIREBASE_MESSAGING_SENDER_ID,
  appId: ENV.FIREBASE_APP_ID,
  measurementId: ENV.FIREBASE_MEASUREMENT_ID,
};

// --- CLOUDINARY CONFIG ---
export const cloudinaryConfig = {
  cloudName: ENV.CLOUDINARY_CLOUD_NAME,
  apiKey: ENV.CLOUDINARY_API_KEY,
  apiSecret: ENV.CLOUDINARY_API_SECRET,
  uploadPreset: ENV.CLOUDINARY_UPLOAD_PRESET,
};
