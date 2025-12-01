import { GoogleGenAI } from "@google/genai";
import { LandRecordFormData } from "../types";

// Initialize Gemini
// Note: In a real production app, ensure the key is valid.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSmartRemarks = async (data: Partial<LandRecordFormData>): Promise<string> => {
  if (!process.env.API_KEY) {
    return "API Key Gemini tidak ditemukan. Harap konfigurasi environment variable.";
  }

  try {
    const prompt = `
      Bertindaklah sebagai asisten administrasi pertanahan profesional.
      Buatkan "KETERANGAN" yang ringkas, formal, dan jelas untuk formulir permohonan pengukuran tanah berdasarkan data berikut:
      
      - Nama Pemilik: ${data.ownerName || '-'}
      - Desa: ${data.village || '-'}
      - Nomor GU: ${data.noGu || '-'}
      - Blok: ${data.block || '-'}
      - Nomor Bidang: ${data.plotNumber || '-'}
      - Luas: ${data.area ? data.area + ' m2' : '-'}
      - Status: ${data.status || '-'}
      - No Dokumen: ${data.documentNumber || '-'}

      Keterangan harus mencakup ringkasan status kelengkapan, lokasi desa, dan tujuan pengukuran. Gunakan Bahasa Indonesia yang baku. Maksimal 2 kalimat.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text ? response.text.trim() : "Gagal membuat keterangan otomatis.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Gagal membuat keterangan otomatis. Silakan isi manual.";
  }
};