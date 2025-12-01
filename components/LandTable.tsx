import React, { useMemo, useRef, useState, useEffect } from 'react';
import { LandRecord, MeasurementStatus, Village, User } from '../types';
import { Trash2, FileText, MapPin, Edit, PlusCircle, Home, Download, Upload, FileSpreadsheet, ChevronLeft, ChevronRight, Search, Lock, Filter, ArrowUpDown, X, SortAsc, SortDesc } from 'lucide-react';
import * as XLSX_Module from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

// Fix for library import compatibility issues
// @ts-ignore
const XLSX = XLSX_Module.default || XLSX_Module;

interface LandTableProps {
  records: LandRecord[];
  onDelete: (id: string) => void;
  onEdit: (record: LandRecord) => void;
  onAddNew: () => void;
  onImport: (records: LandRecord[]) => void;
  currentUser: User | null;
}

const ITEMS_PER_PAGE = 10;

export const LandTable: React.FC<LandTableProps> = ({ records, onDelete, onEdit, onAddNew, onImport, currentUser }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('SEMUA');
  
  // Advanced Filters State
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  // Removed filterBlock state as requested
  const [sortBy, setSortBy] = useState<string>('gu_asc');
  
  // Permissions helpers
  const canAdd = currentUser?.permissions.canAdd || currentUser?.isSuperAdmin;
  const canEdit = currentUser?.permissions.canEdit || currentUser?.isSuperAdmin;
  const canDelete = currentUser?.permissions.canDelete || currentUser?.isSuperAdmin;
  const canExportImport = currentUser?.permissions.canExportImport || currentUser?.isSuperAdmin;
  const isLoggedIn = !!currentUser;
  
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [records.length, searchTerm, activeTab, filterStatus, sortBy]);

  const getStatusColor = (status: MeasurementStatus) => {
    switch (status) {
      case MeasurementStatus.COMPLETED: return 'bg-blue-100 text-blue-800 border-blue-200';
      case MeasurementStatus.VERIFIED: return 'bg-green-100 text-green-800 border-green-200';
      case MeasurementStatus.IN_PROGRESS: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleDownloadTemplate = () => {
    // Example data to guide the user
    const templateData = [
      {
        'NO. GU': 'Cth: N1',
        'NAMA PEMILIK': 'Budi Santoso',
        'DESA': 'Desa Dangdeur',
        'BLOK': '1',
        'BIDANG': '1',
        'NO DOKUMEN': 'C 1234',
        'LUAS (m2)': 150,
        'STATUS': 'Belum Diukur',
        'KETERANGAN': 'Tanah pekarangan'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // NO GU
      { wch: 25 }, // NAMA
      { wch: 20 }, // DESA
      { wch: 10 }, // BLOK
      { wch: 10 }, // BIDANG
      { wch: 20 }, // DOKUMEN
      { wch: 12 }, // LUAS
      { wch: 15 }, // STATUS
      { wch: 25 }, // KETERANGAN
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Upload");
    XLSX.writeFile(wb, "Template_GeoMayora.xlsx");
  };

  const handleDownloadExcel = () => {
    if (!canExportImport) {
        alert("Anda tidak memiliki akses untuk Ekspor Data.");
        return;
    }
    // 1. Create a new workbook
    const wb = XLSX.utils.book_new();

    // 2. Identify unique Villages to export (export all regardless of current tab filter)
    const uniqueVillages = Array.from(new Set(records.map(r => r.village || 'Tanpa Desa'))) as string[];

    // 3. Styles (Reusable)
    const headerStyle = {
      font: { bold: true, color: { rgb: "000000" } },
      fill: { fgColor: { rgb: "D1FAE5" } }, // Soft Emerald (Tailwind emerald-100 hex)
      border: {
        top: { style: "thin", color: { auto: 1 } },
        bottom: { style: "thin", color: { auto: 1 } },
        left: { style: "thin", color: { auto: 1 } },
        right: { style: "thin", color: { auto: 1 } }
      },
      alignment: { horizontal: "center", vertical: "center" }
    };

    const cellStyle = {
      border: {
        top: { style: "thin", color: { rgb: "D1D5DB" } }, // Gray-300
        bottom: { style: "thin", color: { rgb: "D1D5DB" } },
        left: { style: "thin", color: { rgb: "D1D5DB" } },
        right: { style: "thin", color: { rgb: "D1D5DB" } }
      },
      alignment: { vertical: "center" } // Vertically center merged cells
    };

    // 4. Iterate over each village to create a separate sheet
    uniqueVillages.forEach(villageName => {
      // Filter records for this village
      const villageRecords = records.filter(r => (r.village || 'Tanpa Desa') === villageName);

      // Sort by Document Number to ensure identical documents are adjacent for merging
      const sortedRecords = [...villageRecords].sort((a, b) => {
        const docA = a.documentNumber || '';
        const docB = b.documentNumber || '';
        return docA.localeCompare(docB);
      });

      // Format Data
      const dataToExport = sortedRecords.map(r => ({
        'NO. GU': r.noGu,
        'NAMA PEMILIK': r.ownerName,
        'DESA': r.village,
        'BLOK': r.block,
        'BIDANG': r.plotNumber,
        'NO DOKUMEN': r.documentNumber,
        'LUAS (m2)': r.area,
        'STATUS': r.status,
        'KETERANGAN': r.remarks
      }));

      // Create Worksheet
      const ws = XLSX.utils.json_to_sheet(dataToExport);

      // Calculate Merges
      const mergeRanges: XLSX_Module.Range[] = [];
      let startIdx = 0; // Index in sortedRecords (Row = startIdx + 1)

      for (let i = 1; i <= sortedRecords.length; i++) {
        const prevDoc = sortedRecords[i - 1]?.documentNumber;
        const currDoc = sortedRecords[i]?.documentNumber;

        if (currDoc !== prevDoc) {
          if (i - 1 > startIdx) {
            // Merge NO DOKUMEN (Column 5/F)
            mergeRanges.push({
              s: { r: startIdx + 1, c: 5 },
              e: { r: i, c: 5 }
            });
            // Merge LUAS (Column 6/G)
            mergeRanges.push({
              s: { r: startIdx + 1, c: 6 },
              e: { r: i, c: 6 }
            });
          }
          startIdx = i;
        }
      }
      ws['!merges'] = mergeRanges;

      // Apply Styles
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellAddress]) continue;

          if (R === 0) {
            ws[cellAddress].s = headerStyle;
          } else {
            ws[cellAddress].s = cellStyle;
          }
        }
      }

      // Set Column Widths
      ws['!cols'] = [
        { wch: 15 }, // NO GU
        { wch: 25 }, // NAMA
        { wch: 20 }, // DESA
        { wch: 10 }, // BLOK
        { wch: 10 }, // BIDANG
        { wch: 25 }, // DOKUMEN
        { wch: 12 }, // LUAS
        { wch: 15 }, // STATUS
        { wch: 45 }, // KETERANGAN
      ];

      // Enable AutoFilter
      ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

      // Append Sheet to Workbook (Sheet name max 31 chars, forbidden chars stripped automatically by library usually, but strict mapping helps)
      XLSX.utils.book_append_sheet(wb, ws, villageName.substring(0, 31));
    });

    // 5. Write File
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Data_GeoMayora_PerDesa_${date}.xlsx`);
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        if (typeof bstr !== 'string' && !(bstr instanceof ArrayBuffer)) return;

        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Convert sheet to JSON (array of objects)
        const rawData: any[] = XLSX.utils.sheet_to_json(ws);
        
        if (rawData.length === 0) {
          alert("File Excel kosong atau tidak terbaca.");
          return;
        }

        const newRecords: LandRecord[] = rawData.map((row: any) => {
          // Helper to match string to Enum, defaulting to DANGDEUR if not found
          const mapVillage = (val: string): Village => {
            const normalized = val?.toString().trim();
            const found = Object.values(Village).find(v => v === normalized);
            return found || Village.DANGDEUR; // Default fallback
          };

          // Helper to match string to Enum, defaulting to PENDING
          const mapStatus = (val: string): MeasurementStatus => {
            const normalized = val?.toString().trim();
            const found = Object.values(MeasurementStatus).find(v => v === normalized);
            return found || MeasurementStatus.PENDING;
          };

          return {
            id: uuidv4(),
            createdAt: Date.now(),
            noGu: row['NO. GU']?.toString() || '',
            ownerName: row['NAMA PEMILIK']?.toString() || 'Tanpa Nama',
            village: mapVillage(row['DESA']),
            block: row['BLOK']?.toString() || '',
            plotNumber: row['BIDANG']?.toString() || '',
            documentNumber: row['NO DOKUMEN']?.toString() || '',
            area: parseFloat(row['LUAS (m2)']) || 0,
            status: mapStatus(row['STATUS']),
            remarks: row['KETERANGAN']?.toString() || ''
          };
        });

        onImport(newRecords);
        alert(`Berhasil mengimpor ${newRecords.length} data.`);

      } catch (error) {
        console.error("Import Error:", error);
        alert("Gagal membaca file Excel. Pastikan Anda menggunakan Template yang sesuai.");
      }
    };

    reader.readAsBinaryString(file);
    // Reset input so the same file can be selected again if needed
    e.target.value = '';
  };

  // Calculate counts for each village
  const villageCounts = useMemo(() => {
    const counts: Record<string, number> = { 'SEMUA': records.length };
    // Initialize all known villages with 0
    Object.values(Village).forEach(v => counts[v] = 0);
    
    // Count records
    records.forEach(r => {
      if (r.village && counts.hasOwnProperty(r.village)) {
        counts[r.village]++;
      }
    });
    return counts;
  }, [records]);

  // Filter records based on Active Tab, Search Term AND Advanced Filters
  const filteredRecords = useMemo(() => {
    let data = records;

    // 1. Filter by Village Tab (Now also controlled by dropdown)
    if (activeTab !== 'SEMUA') {
      data = data.filter(r => r.village === activeTab);
    }

    // 2. Filter by Search Term
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      data = data.filter(record => 
        record.ownerName.toLowerCase().includes(lowerTerm) ||
        record.noGu.toLowerCase().includes(lowerTerm) ||
        record.documentNumber.toLowerCase().includes(lowerTerm) ||
        (record.village || '').toLowerCase().includes(lowerTerm) ||
        record.block.toLowerCase().includes(lowerTerm) ||
        record.plotNumber.toLowerCase().includes(lowerTerm) ||
        record.remarks.toLowerCase().includes(lowerTerm)
      );
    }

    // 3. Filter by Status
    if (filterStatus !== 'ALL') {
      data = data.filter(r => r.status === filterStatus);
    }

    return data;
  }, [records, searchTerm, activeTab, filterStatus]);

  const groupedRecords = useMemo(() => {
    const groups: Record<string, LandRecord[]> = {};
    filteredRecords.forEach(r => {
      const gu = r.noGu ? r.noGu.trim() : 'Tanpa No. GU';
      const doc = r.documentNumber ? r.documentNumber.trim() : 'Tanpa Dokumen';
      // Create a composite key to group by both fields
      const key = `${gu}##SPLIT##${doc}`;
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    
    // Convert to array for sorting
    const groupEntries = Object.entries(groups);

    // SORTING LOGIC
    groupEntries.sort(([, groupA], [, groupB]) => {
      // Helper to get representative value for the group (first item)
      const a = groupA[0];
      const b = groupB[0];
      const maxDateA = Math.max(...groupA.map(r => r.createdAt));
      const maxDateB = Math.max(...groupB.map(r => r.createdAt));

      // Use logic to get the No. GU for sorting
      const guA = a.noGu || '';
      const guB = b.noGu || '';

      switch (sortBy) {
        case 'newest':
          return maxDateB - maxDateA;
        case 'oldest':
          return maxDateA - maxDateB;
        case 'gu_asc': // Renamed from name_asc, logic changed to GU natural sort
          return guA.localeCompare(guB, undefined, { numeric: true, sensitivity: 'base' });
        case 'gu_desc': // Renamed from name_desc, logic changed to GU natural sort
          return guB.localeCompare(guA, undefined, { numeric: true, sensitivity: 'base' });
        case 'area_high':
          return b.area - a.area;
        case 'area_low':
          return a.area - b.area;
        default:
          // Default to GU Ascending if it's the default, or Newest
          return guA.localeCompare(guB, undefined, { numeric: true, sensitivity: 'base' });
      }
    });

    return groupEntries;
  }, [filteredRecords, sortBy]);

  // PAGINATION LOGIC
  const totalPages = Math.ceil(groupedRecords.length / ITEMS_PER_PAGE);
  const paginatedGroups = groupedRecords.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('ALL');
    setActiveTab('SEMUA'); // Reset village filter
    setSortBy('gu_asc');
  };

  const hasActiveFilters = searchTerm || filterStatus !== 'ALL' || activeTab !== 'SEMUA';

  // Empty State View (only if no records at all in the database)
  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".xlsx, .xls" 
          className="hidden" 
        />
        
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">Belum ada data</h3>
        <p className="text-gray-500 mt-1 mb-6">Silakan input data bidang tanah melalui formulir atau import dari Excel.</p>
        
        {isLoggedIn ? (
          <div className="flex justify-center space-x-3">
            {canExportImport && (
              <>
                <button 
                  onClick={handleUploadClick}
                  className="inline-flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Excel
                </button>

                <button 
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center px-4 py-2 bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Template
                </button>
              </>
            )}
            
            {canAdd && (
              <button 
                onClick={onAddNew}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Input Data Baru
              </button>
            )}
          </div>
        ) : (
           <p className="text-sm text-gray-400 italic">Login untuk menambah data.</p>
        )}
      </div>
    );
  }

  // Data Table View
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".xlsx, .xls" 
        className="hidden" 
      />

      {/* VILLAGE TABS */}
      <div className="flex overflow-x-auto border-b border-gray-200 hide-scrollbar">
          {['SEMUA', ...Object.values(Village)].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap px-6 py-3 text-sm font-medium transition-colors border-b-2 flex items-center ${
                  activeTab === tab 
                    ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab === 'SEMUA' ? 'Semua Desa' : tab}
                <span className={`ml-2 text-xs py-0.5 px-2 rounded-full ${
                   activeTab === tab ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}>
                   {villageCounts[tab] || 0}
                </span>
              </button>
          ))}
      </div>

      <div className="px-6 py-4 border-b border-gray-100 flex flex-col gap-4 bg-gray-50">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4 w-full lg:w-auto">
              <h3 className="font-semibold text-gray-800 whitespace-nowrap hidden lg:block">
                Daftar Bidang
              </h3>
              <div className="relative flex-1 lg:w-72">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition duration-150 ease-in-out"
                    placeholder="Cari pemilik, GU, dokumen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 justify-end w-full lg:w-auto">
            {isLoggedIn ? (
              <>
                {canExportImport && (
                  <>
                    <button 
                      onClick={handleDownloadTemplate}
                      className="text-sm flex items-center text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 font-medium px-3 py-1.5 rounded-lg transition-colors"
                      title="Download Template Excel"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-1.5 hidden sm:inline" />
                      Templt
                    </button>

                    <button 
                      onClick={handleUploadClick}
                      className="text-sm flex items-center text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 font-medium px-3 py-1.5 rounded-lg transition-colors"
                      title="Upload Excel"
                    >
                      <Upload className="w-4 h-4 mr-1.5 hidden sm:inline" />
                      Upload
                    </button>

                    <button 
                      onClick={handleDownloadExcel}
                      className="text-sm flex items-center text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 font-medium px-3 py-1.5 rounded-lg transition-colors"
                      title="Download Excel"
                    >
                      <Download className="w-4 h-4 mr-1.5 hidden sm:inline" />
                      Excel
                    </button>
                  </>
                )}
                
                {canAdd && (
                  <button 
                    onClick={onAddNew}
                    className="text-sm flex items-center text-white bg-emerald-600 hover:bg-emerald-700 font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <PlusCircle className="w-4 h-4 mr-1.5" />
                    Baru
                  </button>
                )}
              </>
            ) : (
              <div className="flex items-center text-gray-500 text-xs italic bg-white px-3 py-1.5 rounded border border-gray-200">
                  <Lock className="w-3 h-3 mr-1.5" />
                  Mode Lihat
              </div>
            )}
          </div>
        </div>

        {/* ADVANCED FILTER BAR */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-200/50">
          <div className="flex items-center text-xs text-gray-500 font-medium mr-1">
            <Filter className="w-3.5 h-3.5 mr-1" />
            Filter & Sort:
          </div>

          {/* Filter Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white text-gray-700 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="ALL">Semua Status</option>
            {Object.values(MeasurementStatus).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Filter Village (Replaces Block Filter) */}
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white text-gray-700 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 max-w-[150px]"
          >
            <option value="SEMUA">Semua Desa</option>
            {Object.values(Village).map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>

          {/* Divider */}
          <div className="h-4 w-px bg-gray-300 mx-1"></div>

          {/* Sort By */}
          <div className="flex items-center">
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white text-gray-700 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="gu_asc">No. GU (A-Z)</option>
              <option value="gu_desc">No. GU (Z-A)</option>
              <option value="newest">Terbaru Diinput</option>
              <option value="oldest">Terlama Diinput</option>
              <option value="area_high">Luas (Terbesar)</option>
              <option value="area_low">Luas (Terkecil)</option>
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto text-xs flex items-center text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
            >
              <X className="w-3 h-3 mr-1" />
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3">Pemilik</th>
              <th className="px-6 py-3">Lokasi (Desa/Blok/Bdg)</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Keterangan</th>
              <th className="px-6 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedGroups.length === 0 ? (
                <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center">
                           <Home className="w-10 h-10 text-gray-200 mb-2" />
                           <p>Tidak ada data ditemukan untuk filter ini.</p>
                           {hasActiveFilters && (
                             <p className="text-xs text-gray-400 mt-1">Coba reset filter atau ubah kata kunci pencarian.</p>
                           )}
                        </div>
                    </td>
                </tr>
            ) : (
                paginatedGroups.map(([key, group]) => {
                  const [gu, doc] = key.split('##SPLIT##');
                  // Take the area from the first record in the group as the "unified" area
                  const unifiedArea = group[0]?.area || 0;
    
                  return (
                  <React.Fragment key={key}>
                    {/* Group Header */}
                    <tr className="bg-gray-100/70 border-y border-gray-200">
                       <td colSpan={5} className="px-6 py-2">
                         <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-bold text-gray-700">
                            <div className="flex items-center" title="Nomor Gambar Ukur">
                                <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 rounded px-2 py-0.5 text-xs mr-2 shadow-sm whitespace-nowrap">
                                GU
                                </span>
                                <span className="truncate">{gu}</span>
                            </div>
                            
                            <div className="flex items-center" title="Nomor Dokumen">
                                <span className="bg-blue-100 text-blue-700 border border-blue-200 rounded px-2 py-0.5 text-xs mr-2 shadow-sm whitespace-nowrap">
                                DOK
                                </span>
                                <span className="truncate">{doc}</span>
                            </div>
    
                             <div className="flex items-center" title="Luas Total Dokumen">
                                <span className="bg-purple-100 text-purple-700 border border-purple-200 rounded px-2 py-0.5 text-xs mr-2 shadow-sm whitespace-nowrap">
                                LUAS
                                </span>
                                <span className="font-mono text-gray-800">{unifiedArea.toLocaleString('id-ID')} m²</span>
                            </div>
    
                            <span className="ml-auto text-xs font-normal text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 whitespace-nowrap">
                              {group.length} Pemilik
                            </span>
                         </div>
                       </td>
                    </tr>
                    {/* Group Rows */}
                    {group.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{record.ownerName}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700 space-y-1">
                            <div className="flex items-center font-medium text-emerald-700">
                              <Home className="w-3 h-3 mr-1.5" />
                              {record.village || '-'}
                            </div>
                            <div className="flex items-center text-gray-500 text-xs">
                              <MapPin className="w-3 h-3 mr-1.5" />
                              Blok: <span className="font-medium text-gray-700 mx-1">{record.block}</span> 
                              | Bdg: <span className="font-medium text-gray-700 ml-1">{record.plotNumber}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate text-gray-600" title={record.remarks}>
                          {record.remarks || '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {canEdit && (
                              <button
                                onClick={() => onEdit(record)}
                                className="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit Data"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => onDelete(record.id)}
                                className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                title="Hapus Data"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            {!canEdit && !canDelete && (
                               <span className="text-gray-300 text-xs">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                  );
                })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Halaman <span className="font-semibold text-gray-800">{currentPage}</span> / <span className="font-semibold text-gray-800">{totalPages}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`p-1.5 rounded-lg border ${
                currentPage === 1 
                  ? 'border-gray-200 text-gray-300 cursor-not-allowed' 
                  : 'border-gray-300 text-gray-600 hover:bg-white hover:text-emerald-600'
              } transition-colors`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                // Simple logic to keep current page centered if possible
                if (totalPages > 5) {
                    if (currentPage > 3) {
                         pageNum = currentPage - 2 + i;
                    }
                    if (pageNum > totalPages) pageNum = -1; // Should not happen with min logic but safe guard
                }
                
                if (pageNum === -1 || pageNum > totalPages) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-emerald-600 text-white'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`p-1.5 rounded-lg border ${
                currentPage === totalPages 
                  ? 'border-gray-200 text-gray-300 cursor-not-allowed' 
                  : 'border-gray-300 text-gray-600 hover:bg-white hover:text-emerald-600'
              } transition-colors`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};