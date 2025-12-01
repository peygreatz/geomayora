import React, { useState, useEffect } from 'react';
import { LandRecordFormData, MeasurementStatus, LandRecord, Village, User } from '../types';
import { Save, Wand2, Loader2, Eraser, Edit2, XCircle, Info } from 'lucide-react';
import { generateSmartRemarks } from '../services/geminiService';

interface LandFormProps {
  onSubmit: (data: LandRecordFormData) => void;
  editingRecord?: LandRecord | null;
  onCancelEdit?: () => void;
  existingRecords: LandRecord[];
  currentUser: User | null;
}

const initialData: LandRecordFormData = {
  noGu: '',
  ownerName: '',
  village: Village.DANGDEUR,
  block: '',
  plotNumber: '',
  documentNumber: '',
  area: 0,
  status: MeasurementStatus.PENDING,
  remarks: '',
};

export const LandForm: React.FC<LandFormProps> = ({ onSubmit, editingRecord, onCancelEdit, existingRecords, currentUser }) => {
  const [formData, setFormData] = useState<LandRecordFormData>(initialData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  // Populate form when editingRecord changes
  useEffect(() => {
    if (editingRecord) {
      // Destructure to remove id and createdAt, keeping only form fields
      const { id, createdAt, ...rest } = editingRecord;
      setFormData({
        ...rest,
        // Ensure village has a value for legacy records that might not have it
        village: rest.village || Village.DANGDEUR
      });
      setAutoFilled(false);
    } else {
      setFormData(initialData);
    }
  }, [editingRecord]);

  // Auto-fill effect when typing Document Number
  useEffect(() => {
    if (!editingRecord && formData.documentNumber && existingRecords.length > 0) {
      const match = existingRecords.find(
        (r) => r.documentNumber.trim().toLowerCase() === formData.documentNumber.trim().toLowerCase()
      );

      if (match) {
        // Auto-fill fields that should be shared across the same document
        setFormData((prev) => ({
          ...prev,
          noGu: match.noGu,
          village: match.village as Village || Village.DANGDEUR,
          block: match.block,
          plotNumber: match.plotNumber,
          area: match.area,
        }));
        setAutoFilled(true);
      } else {
        setAutoFilled(false);
      }
    }
  }, [formData.documentNumber, editingRecord, existingRecords]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'area' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
       alert("Sesi habis, silakan login kembali.");
       return;
    }

    if (editingRecord && !currentUser.permissions.canEdit && !currentUser.isSuperAdmin) {
       alert("Anda tidak memiliki akses untuk mengubah data.");
       return;
    }
    
    if (!editingRecord && !currentUser.permissions.canAdd && !currentUser.isSuperAdmin) {
       alert("Anda tidak memiliki akses untuk menambah data baru.");
       return;
    }

    onSubmit(formData);
    
    // Only reset if we are creating new data. 
    // If editing, the parent component handles clearing the editingRecord state.
    if (!editingRecord) {
      setFormData(initialData);
      setAutoFilled(false);
      alert("Data berhasil disimpan.");
    } else {
      alert("Perubahan berhasil disimpan.");
    }
  };

  const handleGenerateRemarks = async () => {
    setIsGenerating(true);
    const remarks = await generateSmartRemarks(formData);
    setFormData(prev => ({ ...prev, remarks }));
    setIsGenerating(false);
  };

  const handleReset = () => {
    if (editingRecord && onCancelEdit) {
      onCancelEdit();
    } else {
      setFormData(initialData);
      setAutoFilled(false);
    }
  };

  const isEditing = !!editingRecord;

  return (
    <div className={`bg-white rounded-xl shadow-md border overflow-hidden ${isEditing ? 'border-amber-200' : 'border-gray-200'}`}>
      <div className={`px-6 py-4 ${isEditing ? 'bg-amber-500' : 'bg-emerald-600'}`}>
        <h2 className="text-lg font-semibold text-white flex items-center justify-between">
          <span className="flex items-center">
            {isEditing ? <Edit2 className="w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            {isEditing ? 'Edit Data Bidang' : 'Input Data Bidang'}
          </span>
          {isEditing && (
            <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded text-white font-medium">
              Mode Edit
            </span>
          )}
        </h2>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {autoFilled && (
          <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start">
            <Info className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
            <div className="text-sm text-blue-800">
              <span className="font-semibold">Data Ditemukan:</span> Informasi GU, Desa, Blok, Bidang, dan Luas telah diisi otomatis berdasarkan No. Dokumen yang sama.
            </div>
          </div>
        )}

        {/* DESA - Moved to top as requested */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Desa</label>
          <select
            name="village"
            value={formData.village}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white"
          >
            {Object.values(Village).map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* NO. GU */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">No. Gambar Ukur (GU)</label>
          <input
            required
            type="text"
            name="noGu"
            value={formData.noGu}
            onChange={handleChange}
            placeholder="Cth: N1"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* NO DOKUMEN */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">No. Dokumen Alas Hak</label>
          <input
            required
            type="text"
            name="documentNumber"
            value={formData.documentNumber}
            onChange={handleChange}
            placeholder="SHM / Letter C No..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
          />
          <p className="text-xs text-gray-400 mt-1">*Masukkan No. Dokumen yang sama untuk data pemilik tambahan (auto-fill).</p>
        </div>

        {/* NAMA PEMILIK */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pemilik</label>
          <input
            required
            type="text"
            name="ownerName"
            value={formData.ownerName}
            onChange={handleChange}
            placeholder="Nama Lengkap"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* BLOK & BIDANG */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Blok</label>
            <input
              required
              type="text"
              name="block"
              value={formData.block}
              onChange={handleChange}
              placeholder="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">No. Bidang</label>
            <input
              required
              type="text"
              name="plotNumber"
              value={formData.plotNumber}
              onChange={handleChange}
              placeholder="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* LUAS & STATUS */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Luas (m²)</label>
            <input
              required
              type="number"
              min="0"
              name="area"
              value={formData.area}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status Pengukuran</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white"
            >
              {Object.values(MeasurementStatus).map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
        </div>

        {/* KETERANGAN */}
        <div className="md:col-span-2">
          <div className="flex justify-between items-center mb-1">
             <label className="block text-sm font-medium text-gray-700">Keterangan</label>
             <button
               type="button"
               onClick={handleGenerateRemarks}
               disabled={isGenerating || !formData.ownerName}
               className="text-xs flex items-center text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {isGenerating ? <Loader2 className="w-3 h-3 mr-1 animate-spin"/> : <Wand2 className="w-3 h-3 mr-1"/>}
               {isGenerating ? 'Memproses AI...' : 'Buat Otomatis dgn AI'}
             </button>
          </div>
          <textarea
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            placeholder="Keterangan tambahan..."
          />
        </div>

        <div className="md:col-span-2 flex gap-3 pt-2">
          <button
            type="submit"
            className={`flex-1 ${isEditing ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'} text-white font-medium py-2.5 px-4 rounded-lg shadow transition-colors flex justify-center items-center`}
          >
            {isEditing ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                Simpan Perubahan
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Simpan Data
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center"
          >
            {isEditing ? (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                Batal Edit
              </>
            ) : (
              <>
                <Eraser className="w-4 h-4 mr-2" />
                Reset
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
