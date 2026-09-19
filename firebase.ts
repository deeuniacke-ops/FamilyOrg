import firebase from "firebase/app";
import "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA996lW5kmSXQKpx5JW3KN7opQIfn_itDs",
  authDomain: "clann-d9da7.firebaseapp.com",
  projectId: "clann-d9da7",
  storageBucket: "clann-d9da7.firebasestorage.app",
  messagingSenderId: "474614993760",
  appId: "1:474614993760:web:dd75321ce5fc1e55bf0405",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const db = firebase.firestore();
export default firebase;
