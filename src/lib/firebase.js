import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyC2tbyz1FePMfDlyT6Behoe1ustg6JMZbU",
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "procomm-a1cdc.firebaseapp.com",
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "procomm-a1cdc",
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "procomm-a1cdc.firebasestorage.app",
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "538381294070",
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:538381294070:web:34bcd9257aa166932d0fd7",
	measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-W19GYGMMV0",
};

const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(firebaseApp);
let messaging = null;

if (typeof window !== "undefined") {
	isSupported().then((supported) => {
		if (supported) {
			messaging = getMessaging(firebaseApp);
		}
	});
}

auth.useDeviceLanguage();

export { auth, firebaseApp, messaging };
