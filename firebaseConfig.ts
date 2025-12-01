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
  // GANTI DENGAN DATA DARI FIREBASE CONSOLE ANDA
  apiKey: "API_KEY_PALSU_GANTI_INI", 
  authDomain: "geomayora-app.firebaseapp.com",
  projectId: "geomayora-app",
  storageBucket: "geomayora-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
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