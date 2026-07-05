// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAnAwSYbJ3IHMY2wSgJipzh5pUZQnUAJpc",
  authDomain: "reelixapp-6ecfc.firebaseapp.com",
  projectId: "reelixapp-6ecfc",
  storageBucket: "reelixapp-6ecfc.firebasestorage.app",
  messagingSenderId: "964111682526",
  appId: "1:964111682526:web:3fc692493391fe9256ab4f",
  measurementId: "G-1DMPW17C8L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
