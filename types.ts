export enum MeasurementStatus {
  PENDING = 'Belum Diukur',
  IN_PROGRESS = 'Sedang Diukur',
  COMPLETED = 'Selesai Diukur',
  VERIFIED = 'Terverifikasi'
}

export enum Village {
  DANGDEUR = 'Desa Dangdeur',
  PABUARAN = 'Desa Pabuaran',
  PANGKAT = 'Desa Pangkat',
  SUMUR_BANDUNG = 'Desa Sumur Bandung'
}

export interface LandRecord {
  id: string;
  noGu: string;         // NO. GU
  ownerName: string;    // NAMA PEMILIK
  village: string;      // DESA
  block: string;        // BLOK
  plotNumber: string;   // BIDANG (Nomor Bidang)
  documentNumber: string; // NO DOKUMEN
  area: number;         // LUAS m2
  status: MeasurementStatus; // PENGUKURAN
  remarks: string;      // KETERANGAN
  createdAt: number;
}

export type LandRecordFormData = Omit<LandRecord, 'id' | 'createdAt'>;

export interface UserPermissions {
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExportImport: boolean;
}

export interface User {
  username: string;
  password: string;
  email: string;
  permissions: UserPermissions;
  isSuperAdmin?: boolean;
}
