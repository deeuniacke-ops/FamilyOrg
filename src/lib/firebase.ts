import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA996lW5kmSXQKpx5JW3KN7opQIfn_itDs",
  authDomain: "clann-d9da7.firebaseapp.com",
  projectId: "clann-d9da7",
  storageBucket: "clann-d9da7.firebasestorage.app",
  messagingSenderId: "474614993760",
  appId: "1:474614993760:web:dd75321ce5fc1e55bf0405",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
