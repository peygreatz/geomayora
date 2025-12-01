import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ===============================================================================
// KONFIGURASI DATABASE CLOUD (FIREBASE)
// ===============================================================================
// Agar aplikasi bisa diakses online oleh banyak orang dengan database yang sama:
// 1. Buka https://console.firebase.google.com/
// 2. Buat Project Baru
// 3. Pilih "Add App" -> "Web"
// 4. Copy config yang muncul dan paste di bawah ini menggantikan nilai placeholder.
// 5. Di Console Firebase -> Build -> Firestore Database -> Create Database -> Start in Test Mode
// ===============================================================================

const firebaseConfig = {
  apiKey: "AIzaSyD-bZguUyYOEij3jYDgYnKcAzw0Vz9xWqc",
  authDomain: "geomayora.firebaseapp.com",
  projectId: "geomayora",
  storageBucket: "geomayora.firebasestorage.app",
  messagingSenderId: "240250059000",
  appId: "1:240250059000:web:ad6ea54b9a6ef024b3630d"
};

let db: any = null;
let isCloudEnabled = false;

try {
  // Validasi sederhana untuk mengecek apakah config sudah diganti
  if (firebaseConfig.apiKey !== "API_KEY_PALSU_GANTI_INI") {
      const app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      isCloudEnabled = true;
      console.log("🔥 Firebase Cloud Database Connected");
  } else {
      console.warn("⚠️ Menggunakan Local Database (Offline Mode). Konfigurasi Firebase belum diatur.");
  }
} catch (error) {
  console.error("Firebase Init Error:", error);
}

export { db, isCloudEnabled };