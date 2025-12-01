import React, { useState } from 'react';
import { Lock, User, LogIn, X } from 'lucide-react';
import { getUser } from '../services/storageService';
import { User as UserType } from '../types';

interface LoginFormProps {
  onLogin: (user: UserType) => void;
  onClose: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onClose }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 1. Check Hardcoded Super Admin
      const validSuperUser = 'levinzha';
      const validSuperEmail = 'levinzha@gmail.com';
      const validSuperPass = 'bitchx';

      if ((username === validSuperUser || username === validSuperEmail) && password === validSuperPass) {
        onLogin({
          username: 'levinzha',
          email: 'levinzha@gmail.com',
          password: '', // Don't keep in state
          isSuperAdmin: true,
          permissions: {
            canAdd: true,
            canEdit: true,
            canDelete: true,
            canExportImport: true
          }
        });
        return;
      }

      // 2. Check Database Users
      const user = await getUser(username);
      // Fallback check by email not implemented in get() directly without index, 
      // but username is primary key. Simple username check for now.
      
      if (user && user.password === password) {
        onLogin(user);
      } else {
        setError('Username atau Password salah!');
      }

    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan saat login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="bg-emerald-600 p-8 text-center">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-md">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Login Sistem</h2>
          <p className="text-emerald-100 mt-1 text-sm">Masuk untuk mengelola data pertanahan</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center font-medium border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="Masukkan username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="Masukkan password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all transform hover:scale-[1.02] disabled:opacity-70"
            >
              {isLoading ? 'Memproses...' : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Masuk Sistem
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              Hubungi Super Admin (Levinzha) jika belum memiliki akun.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
