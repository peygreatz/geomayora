import React, { useEffect, useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Map, LayoutDashboard, Database, Home, LandPlot, CheckCircle2, Clock, Loader2, Smartphone, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { LandForm } from './components/LandForm';
import { LandTable } from './components/LandTable';
import { LoginForm } from './components/LoginForm';
import { UserManagement } from './components/UserManagement';
import { LandRecord, LandRecordFormData, MeasurementStatus, Village, User } from './types';
import { getRecords, saveRecord, updateRecord, deleteRecord, saveManyRecords } from './services/storageService';

const App: React.FC = () => {
  const [records, setRecords] = useState<LandRecord[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingRecord, setEditingRecord] = useState<LandRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Load data asynchronously
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await getRecords();
        // Sort by most recent
        setRecords(data.sort((a, b) => b.createdAt - a.createdAt));
      } catch (error) {
        console.error("Failed to load data", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [refreshTrigger]);

  // Handle PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setShowLoginModal(false);
    if (user.isSuperAdmin) {
      alert("Login Berhasil! Anda sekarang memiliki akses Super Admin.");
    } else {
      alert(`Selamat datang, ${user.username}.`);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setEditingRecord(null);
    alert("Anda telah logout.");
  };

  const handleSaveRecord = async (data: LandRecordFormData) => {
    // Check Permission
    if (!currentUser) {
      alert("Akses ditolak. Harap login.");
      return;
    }

    if (editingRecord && !currentUser.isSuperAdmin && !currentUser.permissions.canEdit) {
       alert("Anda tidak memiliki izin untuk mengedit data.");
       return;
    }

    if (!editingRecord && !currentUser.isSuperAdmin && !currentUser.permissions.canAdd) {
       alert("Anda tidak memiliki izin untuk menambah data.");
       return;
    }

    setIsLoading(true);
    if (editingRecord) {
      // Update existing record
      const updatedRecord: LandRecord = {
        ...editingRecord,
        ...data,
      };
      await updateRecord(updatedRecord);
      setEditingRecord(null);
    } else {
      // Create new record
      const newRecord: LandRecord = {
        ...data,
        id: uuidv4(),
        createdAt: Date.now(),
      };
      await saveRecord(newRecord);
    }
    setRefreshTrigger(prev => prev + 1);
  };

  const handleImportRecords = async (newRecords: LandRecord[]) => {
    if (!currentUser) return;
    if (!currentUser.isSuperAdmin && !currentUser.permissions.canExportImport) {
       alert("Akses impor data ditolak.");
       return;
    }
    setIsLoading(true);
    await saveManyRecords(newRecords);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDeleteRecord = async (id: string) => {
    if (!currentUser) {
       setShowLoginModal(true);
       return;
    }

    if (!currentUser.isSuperAdmin && !currentUser.permissions.canDelete) {
       alert("Anda tidak memiliki izin untuk menghapus data.");
       return;
    }

    if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      setIsLoading(true);
      await deleteRecord(id);
      setRefreshTrigger(prev => prev + 1);
      // If we are currently editing the deleted record, cancel edit
      if (editingRecord?.id === id) {
        setEditingRecord(null);
      }
    }
  };

  const handleEditRecord = (record: LandRecord) => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    if (!currentUser.isSuperAdmin && !currentUser.permissions.canEdit) {
       alert("Anda tidak memiliki izin untuk mengedit data.");
       return;
    }
    setEditingRecord(record);
    // Smooth scroll to top/form on mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
  };

  const handleAddNew = () => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    if (!currentUser.isSuperAdmin && !currentUser.permissions.canAdd) {
       alert("Anda tidak memiliki izin untuk menambah data.");
       return;
    }
    setEditingRecord(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Group Stats by Village
  const villageStats = useMemo(() => {
    // 1. Get all unique villages, ensuring the Enum values are present
    const enumVillages = Object.values(Village);
    const dataVillages = records.map(r => r.village || 'Tanpa Desa');
    const allVillages = Array.from(new Set([...enumVillages, ...dataVillages]));

    // 2. Calculate stats for each village
    return allVillages.map(villageName => {
      const villageRecords = records.filter(r => (r.village || 'Tanpa Desa') === villageName);
      
      const totalArea = villageRecords.reduce((acc, curr) => acc + curr.area, 0);
      const completedCount = villageRecords.filter(r => r.status === MeasurementStatus.COMPLETED || r.status === MeasurementStatus.VERIFIED).length;
      const pendingCount = villageRecords.filter(r => r.status === MeasurementStatus.PENDING || r.status === MeasurementStatus.IN_PROGRESS).length;

      return {
        name: villageName,
        count: villageRecords.length,
        area: totalArea,
        completed: completedCount,
        pending: pendingCount
      };
    });
  }, [records]);

  // Global Totals for Summary Bar
  const globalStats = useMemo(() => {
    const totalArea = records.reduce((acc, curr) => acc + curr.area, 0);
    const completedCount = records.filter(r => r.status === MeasurementStatus.COMPLETED || r.status === MeasurementStatus.VERIFIED).length;
    return {
      totalCount: records.length,
      totalArea,
      completedCount
    };
  }, [records]);

  // Check if current user is Super Admin
  const isSuperAdmin = currentUser?.isSuperAdmin;
  const canSeeForm = isSuperAdmin || currentUser?.permissions.canAdd || currentUser?.permissions.canEdit;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Login Modal */}
      {showLoginModal && (
        <LoginForm 
          onLogin={handleLogin} 
          onClose={() => setShowLoginModal(false)} 
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-600 p-2 rounded-lg shadow-sm">
               <Map className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">GeoMayora</h1>
              <p className="text-xs text-gray-500 font-medium hidden sm:block">Sistem Input Bidang Tanah</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
             {isInstallable && (
               <button 
                 onClick={handleInstallClick}
                 className="hidden md:flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold transition-colors shadow-sm animate-pulse"
               >
                 <Smartphone className="w-3 h-3 mr-1.5" />
                 Install App
               </button>
             )}
             
             {currentUser ? (
               <div className="flex items-center space-x-3">
                 <span className="text-sm font-medium text-gray-700 hidden sm:block">
                   Hi, {currentUser.username}
                 </span>
                 <button
                   onClick={handleLogout}
                   className="flex items-center px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors border border-red-100"
                 >
                   <LogOut className="w-4 h-4 mr-2" />
                   Logout
                 </button>
               </div>
             ) : (
               <button
                 onClick={() => setShowLoginModal(true)}
                 className="flex items-center px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-medium transition-colors border border-emerald-100"
               >
                 <LogIn className="w-4 h-4 mr-2" />
                 Login
               </button>
             )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* User Status Banner */}
        {currentUser && (
          <div className={`mb-6 px-4 py-3 rounded-lg shadow-md flex items-center justify-between ${isSuperAdmin ? 'bg-emerald-700 text-white' : 'bg-blue-600 text-white'}`}>
            <div className="flex items-center">
              <ShieldCheck className="w-5 h-5 mr-2" />
              <span className="font-medium">
                {isSuperAdmin ? 'Mode Super Admin' : `Login sebagai ${currentUser.username}`}
              </span>
            </div>
            <div className="flex gap-2">
                {currentUser.permissions?.canAdd && <span className="text-xs bg-white/20 px-2 py-1 rounded">Add</span>}
                {currentUser.permissions?.canEdit && <span className="text-xs bg-white/20 px-2 py-1 rounded">Edit</span>}
                {currentUser.permissions?.canDelete && <span className="text-xs bg-white/20 px-2 py-1 rounded">Del</span>}
            </div>
          </div>
        )}

        {/* Global Summary Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center text-gray-700">
            <LayoutDashboard className="w-5 h-5 mr-2 text-emerald-600" />
            <span className="font-semibold mr-2">Total Keseluruhan:</span>
            {isLoading ? (
              <span className="text-xs text-gray-400">Memuat...</span>
            ) : (
              <>
                <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-sm font-bold border border-gray-200">
                  {globalStats.totalCount} Bidang
                </span>
                <span className="mx-2 text-gray-300">|</span>
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-sm font-bold border border-blue-100">
                  {globalStats.totalArea.toLocaleString('id-ID')} m²
                </span>
              </>
            )}
          </div>
          <div className="text-sm text-gray-500">
             Progress Global: <b>{globalStats.totalCount > 0 ? Math.round((globalStats.completedCount / globalStats.totalCount) * 100) : 0}%</b> Selesai
          </div>
        </div>

        {/* Village Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
           {villageStats.map((stat) => (
             <div key={stat.name} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center text-white">
                    <Home className="w-4 h-4 mr-2 opacity-90" />
                    <span className="font-semibold text-sm truncate max-w-[120px]" title={stat.name}>
                      {stat.name}
                    </span>
                  </div>
                  <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                    {isLoading ? '...' : stat.count} Data
                  </span>
                </div>
                
                <div className="p-4 space-y-4">
                  {/* Total Luas */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-gray-500 text-sm">
                      <LandPlot className="w-4 h-4 mr-2 text-blue-500" />
                      <span>Luas Total</span>
                    </div>
                    <span className="font-bold text-gray-800">
                      {isLoading ? '...' : stat.area.toLocaleString('id-ID')} m²
                    </span>
                  </div>

                  <div className="h-px bg-gray-100"></div>

                  {/* Status Breakdown */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                      <div className="flex items-center text-green-700 text-xs mb-1">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Selesai
                      </div>
                      <div className="font-bold text-green-800 text-lg leading-none">
                        {isLoading ? '...' : stat.completed}
                      </div>
                    </div>
                    
                    <div className="bg-amber-50 p-2 rounded-lg border border-amber-100">
                      <div className="flex items-center text-amber-700 text-xs mb-1">
                        <Clock className="w-3 h-3 mr-1" />
                        Belum
                      </div>
                      <div className="font-bold text-amber-800 text-lg leading-none">
                        {isLoading ? '...' : stat.pending}
                      </div>
                    </div>
                  </div>

                </div>
             </div>
           ))}
        </div>

        {/* Super Admin User Management Panel */}
        {isSuperAdmin && (
          <UserManagement />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Form - VISIBLE IF ADMIN OR HAS ADD/EDIT PERMISSIONS */}
          {canSeeForm ? (
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <LandForm 
                  onSubmit={handleSaveRecord} 
                  editingRecord={editingRecord}
                  onCancelEdit={handleCancelEdit}
                  existingRecords={records}
                  currentUser={currentUser}
                />
              </div>
            </div>
          ) : (
             // Info box for public view
             <div className="hidden lg:block lg:col-span-1">
                <div className="sticky top-24 bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                   <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Database className="w-8 h-8 text-emerald-600" />
                   </div>
                   <h3 className="text-lg font-semibold text-gray-900">Database Publik</h3>
                   <p className="text-gray-500 mt-2 text-sm">
                     Anda sedang melihat data dalam mode publik. Silakan Login untuk melakukan perubahan data.
                   </p>
                   <button 
                     onClick={() => setShowLoginModal(true)}
                     className="mt-6 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                   >
                     Login
                   </button>
                </div>
             </div>
          )}

          {/* Right Column: Table - Adjust span based on auth state */}
          <div className="lg:col-span-2">
            {isLoading ? (
               <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center h-64">
                 <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                 <p className="text-gray-500 font-medium">Memuat Database...</p>
               </div>
            ) : (
              <LandTable 
                records={records} 
                onDelete={handleDeleteRecord} 
                onEdit={handleEditRecord}
                onAddNew={handleAddNew}
                onImport={handleImportRecords}
                currentUser={currentUser}
              />
            )}
          </div>
        </div>
      </main>
      
      <footer className="bg-white border-t border-gray-200 py-6 mt-8">
         <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} GeoMayora - Sistem Input Bidang Tanah. Powered by PeYGreatz.
         </div>
      </footer>
    </div>
  );
};

export default App;
