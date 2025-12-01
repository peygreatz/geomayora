import { db } from '../db';
import { LandRecord, User } from '../types';

const OLD_STORAGE_KEY = 'geosip_land_records';

// Migrate data from LocalStorage to IndexedDB (One time run)
export const migrateFromLocalStorage = async (): Promise<void> => {
  try {
    const stored = localStorage.getItem(OLD_STORAGE_KEY);
    if (stored) {
      const records: LandRecord[] = JSON.parse(stored);
      if (records.length > 0) {
        console.log(`Migrating ${records.length} records from LocalStorage to Database...`);
        await db.landRecords.bulkPut(records);
        // Clear old storage after successful migration
        localStorage.removeItem(OLD_STORAGE_KEY);
        console.log('Migration successful.');
      }
    }
  } catch (error) {
    console.error("Migration failed:", error);
  }
};

export const getRecords = async (): Promise<LandRecord[]> => {
  try {
    // Ensure migration runs before first fetch
    await migrateFromLocalStorage();
    return await db.landRecords.toArray();
  } catch (error) {
    console.error("Failed to load records from DB", error);
    return [];
  }
};

export const saveRecord = async (record: LandRecord): Promise<void> => {
  await db.landRecords.add(record);
};

export const saveManyRecords = async (newRecords: LandRecord[]): Promise<void> => {
  await db.landRecords.bulkAdd(newRecords);
};

export const updateRecord = async (record: LandRecord): Promise<void> => {
  try {
    await db.landRecords.put(record);
  } catch (error) {
    console.error(`Update failed for record ${record.id}:`, error);
  }
};

export const deleteRecord = async (id: string): Promise<void> => {
  await db.landRecords.delete(id);
};

export const deleteAllRecords = async (): Promise<void> => {
  await db.landRecords.clear();
};

// --- USER MANAGEMENT ---

export const saveUser = async (user: User): Promise<void> => {
  await db.users.put(user);
};

export const getUser = async (username: string): Promise<User | undefined> => {
  return await db.users.get(username);
};

export const getAllUsers = async (): Promise<User[]> => {
  return await db.users.toArray();
};

export const deleteUser = async (username: string): Promise<void> => {
  await db.users.delete(username);
};
