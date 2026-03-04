// Firebase core
import { initializeApp } from "firebase/app";

// Firestore database
import { getFirestore } from "firebase/firestore";

// Storage (for images later)
import { getStorage } from "firebase/storage";

// 🔐 Your config
const firebaseConfig = {
  apiKey: "AIzaSyCvnnfANJwwQzj9I1Gim48W12fFRGkBNJ8",
  authDomain: "civiceye-35701.firebaseapp.com",
  projectId: "civiceye-35701",
  storageBucket: "civiceye-35701.firebasestorage.app",
  messagingSenderId: "758590032320",
  appId: "1:758590032320:web:e5cf61710b0e23d6f66025"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Database
export const db = getFirestore(app);

// Storage
export const storage = getStorage(app);