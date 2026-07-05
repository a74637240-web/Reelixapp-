import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// यहाँ आपके फायरबेस का पूरा मॉक कॉन्फ़िगरेशन है
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

// सभी ज़रूरी टूल्स को एक्सपोर्ट करें ताकि कोई फ़ाइल न अटके
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
