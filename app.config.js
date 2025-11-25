export default ({ config }) => ({
    ...config,
    android: {
        ...config.android,
        package: "com.benellit.maintely",
        googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
        permissions: [
            "android.permission.READ_MEDIA_IMAGES",
            "android.permission.CAMERA",
        ],
        notification: {
            icon: "./assets/notification-icon.png",
        },
        adaptiveIcon: {
            foregroundImage: "./assets/logoMaintely.png",
            backgroundColor: "#ffffff"
        }
    },
    extra: {
        eas: {
            projectId: "8e421a71-231c-4352-a485-8c9891a8f3c0"
        },
        FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
        FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
        FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
        FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
        FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
        FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID,

        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_UPLOAD_PRESET: process.env.CLOUDINARY_UPLOAD_PRESET,
    },
});
