// apps/mobile_app/lib/firebase.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBZ4YeRozYEw0XiUTS2U4Jt2Ccw23NRkN0",
  authDomain: "phoneauth-e2c75.firebaseapp.com",
  projectId: "phoneauth-e2c75",
  storageBucket: "phoneauth-e2c75.firebasestorage.app",
  messagingSenderId: "724955628302",
  appId: "1:724955628302:web:6ffabfd28cb33823accd5f"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
