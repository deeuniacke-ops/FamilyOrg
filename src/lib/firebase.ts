import firebase from "firebase/app";
import "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBS9Tpp3dZH_NAuX4S9zLi6q-JCZVitgBs",
  authDomain: "cluichi-41e2d.firebaseapp.com",
  projectId: "cluichi-41e2d",
  storageBucket: "cluichi-41e2d.firebasestorage.app",
  messagingSenderId: "570707015264",
  appId: "1:570707015264:web:5347de0f2d3ea453a8f505",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const db = firebase.firestore();
export default firebase;
