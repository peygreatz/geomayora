
import Dexie, { Table } from 'dexie';
import { LandRecord, User } from './types';

export class GeoSipDB extends Dexie {
  landRecords!: Table<LandRecord>;
  users!: Table<User>;

  constructor() {
    super('GeoSipDB');
    
    // Define tables and indexes
    // id is the primary key for landRecords
    // username is the primary key for users
    // Added fileLink to schema (though Dexie handles extra fields automatically, adding it to index if needed)
    (this as any).version(1).stores({
      landRecords: 'id, noGu, documentNumber, village, status, createdAt, fileLink',
      users: 'username, email'
    });
  }
}

export const db = new GeoSipDB();
