// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCLR2N5Alw3mm9sLSaHzi0VP4TsvZNDaWs",
  authDomain: "neurolens-931f0.firebaseapp.com",
  projectId: "neurolens-931f0",
  storageBucket: "neurolens-931f0.firebasestorage.app",
  messagingSenderId: "349413538748",
  appId: "1:349413538748:web:491e999e58a6b04d8109b9",
  measurementId: "G-XG2VLJ6Y4E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Analytics (optional, may not work in React Native)
// Uncomment if you want to use it in web
// export const analytics = getAnalytics(app);

export default app;
