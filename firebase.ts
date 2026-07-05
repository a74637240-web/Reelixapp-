import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// यहाँ आपके फायरबेस का कॉन्फ़िगरेशन है (डिफ़ॉल्ट या खाली रखा है ताकि बिल्ड न रुके)
const firebaseConfig = {
  apiKey: "mock-api-key",
  authDomain: "mock-auth.firebaseapp.com",
  projectId: "mock-project-id",
  storageBucket: "mock-storage.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:123456789"
};

// फायरबेस को इनिशियलाइज़ करें
const app = initializeApp(firebaseConfig);

// ऑथेंटिकेशन एक्सपोर्ट करें
export const auth = getAuth(app);
export default app;
