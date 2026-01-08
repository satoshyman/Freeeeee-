
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';

// --- Types ---
export enum AppTab { MINING = 'mining', FRIENDS = 'friends', TASKS = 'tasks', WALLET = 'wallet', ADMIN = 'admin' }
export interface GlobalConfig { miningDuration: number; miningRate: number; minWithdrawal: number; }
export interface Task { id: number; title: string; reward: number; link: string; icon: string; }
export interface Withdrawal { id: string; userId: string; username: string; amount: number; address: string; status: 'pending' | 'completed' | 'rejected'; date: number; }
export interface User {
  id: string; username: string; balance: number; referrals: string[]; activeReferrals: string[]; referredBy?: string;
  miningState: { isActive: boolean; startTime?: number; };
  tasksCompleted: number[]; withdrawals: Withdrawal[]; hasStartedFirstMining: boolean;
}

// --- Constants & Database Logic ---
const STORAGE_KEY = 'ton_miner_v4_db';
const CONFIG_KEY = 'ton_miner_v4_config';
const getDB = (): Record<string, User> => JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
const saveDB = (db: Record<string, User>) => localStorage.setItem(STORAGE_KEY, JSON.stringify(db));

const DEFAULT_CONFIG: GlobalConfig = { miningDuration: 3 * 60 * 60 * 1000, miningRate: 0.015, minWithdrawal: 0.1 };
const TASKS: Task[] = [
  { id: 1, title: "Telegram Channel", reward: 0.005, link: "https://t.me/example", icon: "📢" },
  { id: 2, title: "Follow on X", reward: 0.003, link: "https://x.com", icon: "🐦" }
];

const userService = {
  getConfig: (): GlobalConfig => JSON.parse(localStorage.getItem(CONFIG_KEY) || JSON.stringify(DEFAULT_CONFIG)),
  updateConfig: (c: GlobalConfig) => localStorage.setItem(CONFIG_KEY, JSON.stringify(c)),
  
  initializeUser: async (tgUser: any, startParam?: string): Promise<User> => {
    const db = getDB();
    const id = tgUser?.id?.toString() || "dev_user";
    const username = tgUser?.username || "Guest";

    if (db[id]) return db[id];

    const newUser: User = {
      id, username, balance: 0, referrals: [], activeReferrals: [],
      miningState: { isActive: false }, tasksCompleted: [], withdrawals: [],
      hasStartedFirstMining: false, referredBy: startParam !== id ? startParam : undefined
    };

    if (newUser.referredBy && db[newUser.referredBy]) {
      if (!db[newUser.referredBy].referrals.includes(id)) {
        db[newUser.referredBy].referrals.push(id);
      }
    }

    db[id] = newUser;
    saveDB(db);
    return newUser;
  },

  startMining: async (userId: string): Promise<User> => {
    const db ف= getDB();
    const user = db[userId];
    user.miningState = { isActive: true, startTime: Date.now() };

    // إصلاح الإحالة: إضافة المكافأة للمدعي ٧ عند أول تعدين
    if (!user.hasStartedFirstMining && user.referredBy && db[user.referredBy]) {
      const referrer = db[user.referredBy];
      if (!referrer.activeReferrals.includes(userId)) {
        referrer.activeReferrals.push(userId);
        referrer.balance += 0.005; // مكافأة الإحالة (يمكنك تعديلها)
        db[user.referredBy] = referrer;
      }
      user.hasStartedFirstMining = true;
    }

    db[userId] = user;
    saveDB(db);
    return user;
  },

  collectMining: async (userId: string, amount: number): Promise<User> => {
    const db = getDB();
    const user = db[userId];
    user.balance += amount;
    user.miningState.isActive = false;
    db[userId] = user;
    saveDB(db);
    return user;
  }
};

// --- Components ---
const TonIcon = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 100 100" className={`w-20 h-20 drop-shadow-2xl transition-all duration-1000 ${active ? 'animate-ton-pulse scale-110' : 'opacity-40'}`}>
    <circle cx="50" cy="50" r="45" fill="#0088CC" />
    <path d="M50 25L25 45L50 75L75 45L50 25Z" fill="white" />
  </svg>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<AppTab>(AppTab.MINING);
  const [config] = useState(userService.getConfig());
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentMined, setCurrentMined] = useState(0);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    userService.initializeUser(tg?.initDataUnsafe?.user, tg?.initDataUnsafe?.start_param).then(setUser);
  }, []);

  useEffect(() => {
    let interval: any;
    if (user?.miningState.isActive && user.miningState.startTime) {
      interval = setInterval(() => {
        const elapsed = Date.now() - user.miningState.startTime!;
        const remaining = Math.max(0, config.miningDuration - elapsed);
        const progress = Math.min(1, elapsed / config.miningDuration);
        setTimeLeft(remaining);
        setCurrentMined(progress * config.miningRate);
        if (remaining <= 0) clearInterval(interval);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [user?.miningState, config]);

  const formatTime = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!user) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="max-w-md mx-auto min-h-screen p-4 flex flex-col">
      <header className="flex justify-between items-center mb-8 glass-card p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#0088CC] rounded-full flex items-center justify-center text-[10px]">T</div>
          <span className="font-black text-xl">{user.balance.toFixed(4)}</span>
        </div>
        <span className="text-xs font-bold opacity-60">@{user.username}</span>
      </header>

      <main className="flex-grow">
        {tab === AppTab.MINING && (
          <div className="flex flex-col items-center space-y-12 py-8">
            <div className="text-center space-y-2">
              <p className="text-xs uppercase font-black opacity-50 tracking-widest">المبلغ المجمع حالياً</p>
              <h2 className="text-4xl font-black text-[#00d2ff]">{currentMined.toFixed(6)} TON</h2>
            </div>
            
            <div className="relative">
              {user.miningState.isActive && <div className="absolute inset-0 bg-[#0088CC]/20 blur-3xl animate-pulse rounded-full"></div>}
              <div className="w-64 h-64 glass-card rounded-full flex items-center justify-center border-2 border-white/5 relative z-10">
                <TonIcon active={user.miningState.isActive} />
              </div>
            </div>

            <div className="w-full space-y-4">
              <div className="text-center glass-card py-2 rounded-full text-xs font-bold">
                {user.miningState.isActive ? `الوقت المتبقي: ${formatTime(timeLeft)}` : "المحرك جاهز"}
              </div>
              <button 
                onClick={() => user.miningState.isActive ? (timeLeft <= 0 && userService.collectMining(user.id, currentMined).then(setUser)) : userService.startMining(user.id).then(setUser)}
                disabled={user.miningState.isActive && timeLeft > 0}
                className={`w-full py-5 rounded-3xl font-black text-xl shadow-2xl transition-all ${user.miningState.isActive ? (timeLeft <= 0 ? 'bg-green-500 text-black' : 'bg-white/5 opacity-50') : 'bg-[#0088CC] text-white'}`}
              >
                {user.miningState.isActive ? (timeLeft > 0 ? "جاري التعدين..." : "تحصيل الأرباح 💎") : "بدء التعدين ⚡"}
              </button>
            </div>
          </div>
        )}

        {tab === AppTab.FRIENDS && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-center">الإحالات 👥</h2>
            <div className="glass-card p-6 rounded-3xl text-center space-y-2">
              <p className="text-xs opacity-60">اربح 0.005 TON عن كل صديق نشط</p>
              <p className="text-3xl font-black text-[#00d2ff]">{user.activeReferrals.length}</p>
              <button onClick={() => {
                const link = `https://t.me/YourBotName/app?startapp=${user.id}`;
                (window as any).Telegram?.WebApp?.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=Join%20me!`);
              }} className="w-full bg-white text-black py-3 rounded-2xl font-black text-sm mt-4">دعوة صديق 🔗</button>
            </div>
          </div>
        )}
        
        {/* المهام والسحب بنفس المنطق المدمج... */}
      </main>

      <nav className="fixed bottom-6 left-6 right-6 glass-card p-2 rounded-[2.5rem] flex justify-around shadow-2xl border-white/10">
        {[
          { id: AppTab.MINING, icon: "💎", label: "تعدين" },
          { id: AppTab.FRIENDS, icon: "👥", label: "أصدقاء" },
          { id: AppTab.TASKS, icon: "🎯", label: "مهام" },
          { id: AppTab.WALLET, icon: "🏦", label: "سحب" }
    ٥    ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex flex-col items-center p-3 rounded-3xl ${tab === t.id ? 'bg-[#0088CC] text-white' : 'opacity-40'}`}>
            <span className="text-xl">{t.icon}</span>
            <span className="text-[8px] font-bold uppercase">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
