
import { db as localDb } from '../db';
import { db as cloudDb, isCloudEnabled } from '../firebaseConfig';
import { LandRecord, User } from '../types';
import { hashPassword } from '../utils/security';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc, 
  writeBatch,
  getDoc,
  query,
  where
} from 'firebase/firestore';

const OLD_STORAGE_KEY = 'geosip_land_records';

// --- MIGRATION HELPER ---
export const migrateFromLocalStorage = async (): Promise<void> => {
  try {
    const stored = localStorage.getItem(OLD_STORAGE_KEY);
    if (stored) {
      const records: LandRecord[] = JSON.parse(stored);
      if (records.length > 0) {
        if (isCloudEnabled) {
             // Migrate to Cloud
             const batch = writeBatch(cloudDb);
             records.forEach(r => {
                 const ref = doc(cloudDb, "landRecords", r.id);
                 batch.set(ref, r);
             });
             await batch.commit();
        } else {
             // Migrate to Local DB
             await localDb.landRecords.bulkPut(records);
        }
        localStorage.removeItem(OLD_STORAGE_KEY);
      }
    }
  } catch (error) {
    console.error("Migration failed:", error);
  }
};

// --- DATA ACCESS LAYER (Hybrid: Cloud / Local) ---

export const getRecords = async (): Promise<LandRecord[]> => {
  await migrateFromLocalStorage();

  if (isCloudEnabled) {
      try {
          const querySnapshot = await getDocs(collection(cloudDb, "landRecords"));
          const records: LandRecord[] = [];
          querySnapshot.forEach((doc) => {
              records.push(doc.data() as LandRecord);
          });
          return records;
      } catch (err) {
          console.error("Cloud Fetch Error, falling back to local:", err);
          return await localDb.landRecords.toArray();
      }
  } else {
      return await localDb.landRecords.toArray();
  }
};

export const saveRecord = async (record: LandRecord): Promise<void> => {
  if (isCloudEnabled) {
      await setDoc(doc(cloudDb, "landRecords", record.id), record);
  } else {
      await localDb.landRecords.add(record);
  }
};

export const saveManyRecords = async (newRecords: LandRecord[]): Promise<void> => {
  if (isCloudEnabled) {
      const batch = writeBatch(cloudDb);
      newRecords.forEach(r => {
          const ref = doc(cloudDb, "landRecords", r.id);
          batch.set(ref, r);
      });
      await batch.commit();
  } else {
      await localDb.landRecords.bulkAdd(newRecords);
  }
};

export const updateRecord = async (record: LandRecord): Promise<void> => {
  if (isCloudEnabled) {
      await setDoc(doc(cloudDb, "landRecords", record.id), record, { merge: true });
  } else {
      await localDb.landRecords.put(record);
  }
};

// --- LINK SYNCHRONIZATION ---
export const updateSharedLinks = async (noGu: string, fileLink: string): Promise<void> => {
  if (!noGu) return;
  const normalizedGu = noGu.trim();

  if (isCloudEnabled) {
    try {
      // Query all records with the same NO. GU
      const q = query(collection(cloudDb, "landRecords"), where("noGu", "==", normalizedGu));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const batch = writeBatch(cloudDb);
        querySnapshot.forEach((doc) => {
           batch.update(doc.ref, { fileLink: fileLink });
        });
        await batch.commit();
      }
    } catch (err) {
      console.error("Failed to sync links in cloud:", err);
    }
  } else {
    // Local DB Batch Update
    try {
      await localDb.landRecords
        .where('noGu')
        .equals(normalizedGu)
        .modify({ fileLink: fileLink });
    } catch (err) {
       console.error("Failed to sync links locally:", err);
    }
  }
};

export const deleteRecord = async (id: string): Promise<void> => {
  if (isCloudEnabled) {
      await deleteDoc(doc(cloudDb, "landRecords", id));
  } else {
      await localDb.landRecords.delete(id);
  }
};

export const deleteAllRecords = async (): Promise<void> => {
   // Warning: Dangerous operation
   if (isCloudEnabled) {
       const snapshot = await getDocs(collection(cloudDb, "landRecords"));
       const batch = writeBatch(cloudDb);
       snapshot.forEach((doc) => {
           batch.delete(doc.ref);
       });
       await batch.commit();
   } else {
       await localDb.landRecords.clear();
   }
};

// --- USER MANAGEMENT ---

export const saveUser = async (user: User): Promise<void> => {
  if (isCloudEnabled) {
      await setDoc(doc(cloudDb, "users", user.username), user);
  } else {
      await localDb.users.put(user);
  }
};

export const getUser = async (username: string): Promise<User | undefined> => {
  if (isCloudEnabled) {
      const docRef = doc(cloudDb, "users", username);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
          return docSnap.data() as User;
      }
      return undefined;
  } else {
      return await localDb.users.get(username);
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  if (isCloudEnabled) {
      const querySnapshot = await getDocs(collection(cloudDb, "users"));
      const users: User[] = [];
      querySnapshot.forEach((doc) => {
          users.push(doc.data() as User);
      });
      return users;
  } else {
      return await localDb.users.toArray();
  }
};

export const deleteUser = async (username: string): Promise<void> => {
  if (isCloudEnabled) {
      await deleteDoc(doc(cloudDb, "users", username));
  } else {
      await localDb.users.delete(username);
  }
};

// --- SECURITY INITIALIZATION ---
export const initializeSuperAdmin = async () => {
  const superAdminUsername = 'levinzha';
  
  // Check if super admin already exists
  const existing = await getUser(superAdminUsername);
  
  if (!existing) {
    console.log("Initializing Super Admin...");
    // Hash the default password securely
    const hashedPassword = await hashPassword('bitchx');
    
    const superAdminUser: User = {
      username: superAdminUsername,
      email: 'levinzha@gmail.com',
      password: hashedPassword, // Store hashed password
      isSuperAdmin: true,
      permissions: {
        canAdd: true,
        canEdit: true,
        canDelete: true,
        canExportImport: true
      }
    };
    
    await saveUser(superAdminUser);
    console.log("Super Admin Created Securely.");
  }
};

export const getStorageStatus = () => {
    return isCloudEnabled ? 'CLOUD (ONLINE)' : 'LOCAL (OFFLINE)';
};
