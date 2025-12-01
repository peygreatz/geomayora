
import React, { useState, useEffect } from 'react';
import { User, UserPermissions } from '../types';
import { saveUser, getAllUsers, deleteUser } from '../services/storageService';
import { hashPassword } from '../utils/security';
import { UserPlus, Trash2, CheckSquare, Square, Shield, ChevronDown, ChevronUp } from 'lucide-react';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [permissions, setPermissions] = useState<UserPermissions>({
    canAdd: false,
    canEdit: false,
    canDelete: false,
    canExportImport: false,
  });
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const data = await getAllUsers();
    setUsers(data);
  };

  const handlePermissionChange = (key: keyof UserPermissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !email) {
      alert("Semua field wajib diisi!");
      return;
    }

    // Hash the password before saving!
    const hashedPassword = await hashPassword(password);

    const newUser: User = {
      username,
      password: hashedPassword, // Secured
      email,
      permissions,
      isSuperAdmin: false
    };

    await saveUser(newUser);
    alert("User berhasil ditambahkan!");
    
    // Reset form
    setUsername('');
    setPassword('');
    setEmail('');
    setPermissions({
      canAdd: false,
      canEdit: false,
      canDelete: false,
      canExportImport: false,
    });
    
    loadUsers();
  };

  const handleDelete = async (usernameToDelete: string) => {
    if (usernameToDelete === 'levinzha') {
      alert("Tidak dapat menghapus Super Admin Utama!");
      return;
    }
    if (confirm(`Hapus user ${usernameToDelete}?`)) {
      await deleteUser(usernameToDelete);
      loadUsers();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-8 transition-all duration-300">
      <div 
        className="px-6 py-4 bg-gray-800 text-white flex items-center justify-between cursor-pointer hover:bg-gray-700 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            <h2 className="font-bold">Manajemen User (Super Admin Dashboard)</h2>
        </div>
        <div className="flex items-center text-sm text-gray-300">
            <span className="mr-2 hidden sm:block">{isExpanded ? 'Minimize' : 'Expand'}</span>
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-top-2 duration-300">
          {/* Form Add User */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <UserPlus className="w-5 h-5 mr-2 text-emerald-600" />
              Tambah User Baru
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  placeholder="cth: admin_desa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="text"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  placeholder="password123"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Hak Akses (Roles)</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={permissions.canAdd} onChange={() => handlePermissionChange('canAdd')} className="rounded text-emerald-600 focus:ring-emerald-500" />
                    <span className="text-sm text-gray-700">Tambah Data Baru</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={permissions.canEdit} onChange={() => handlePermissionChange('canEdit')} className="rounded text-emerald-600 focus:ring-emerald-500" />
                    <span className="text-sm text-gray-700">Ubah / Edit Data</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={permissions.canDelete} onChange={() => handlePermissionChange('canDelete')} className="rounded text-emerald-600 focus:ring-emerald-500" />
                    <span className="text-sm text-gray-700">Hapus Data</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={permissions.canExportImport} onChange={() => handlePermissionChange('canExportImport')} className="rounded text-emerald-600 focus:ring-emerald-500" />
                    <span className="text-sm text-gray-700">Ekspor & Impor Excel</span>
                  </label>
                </div>
              </div>

              <button type="submit" className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 transition font-medium">
                Simpan User
              </button>
            </form>
          </div>

          {/* List Users */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Daftar User</h3>
            <div className="bg-white border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-4 text-center text-sm text-gray-500">Belum ada user tambahan.</td>
                      </tr>
                    ) : (
                      users.map(u => (
                        <tr key={u.username}>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">{u.username}</div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {u.permissions.canAdd && <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">Add</span>}
                              {u.permissions.canEdit && <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">Edit</span>}
                              {u.permissions.canDelete && <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded">Del</span>}
                              {u.permissions.canExportImport && <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">Ex/Im</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {u.username !== 'levinzha' && (
                              <button onClick={() => handleDelete(u.username)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
