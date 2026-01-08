
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';

// --- الإعدادات ---
const BOT_USERNAME = "YourBotName"; // !!! هام: استبدل هذا بيوزر بوتك بدون @ !!!
const REWARD_AMOUNT = 0.01; // مكافأة الإحالة النشطة
const MINING_RATE = 0.015;  // ربح الجلسة الواحدة
const MINING_TIME = 3 * 60 * 60 * 1000; // 3 ساعات بالملي ثانية

enum AppTab { MINING = 'mining', FRIENDS = 'friends', TASKS = 'tasks', WALLET = 'wallet' }

interface User {
  id: string; username: string; balance: number;
  referrals: string[]; activeReferrals: string[]; referredBy?: string;
  miningState: { isActive: boolean; startTime?: number; };
  hasStartedFirstMining: boolean;
}

// --- خدمات البيانات ---
const DB_KEY = 'ton_miner_final_v1';
const getDB = (): Record<string, User> => JSON.parse(localStorage.getItem(DB_KEY) || '{}');
const saveDB = (db: Record<string, User>) => localStorage.setItem(DB_KEY, JSON.stringify(db));

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<AppTab>(AppTab.MINING);
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentMined, setCurrentMined] = useState(0);

  // 1. تهيئة المستخدم عند الدخول
  useEffect(() => {
    const init = () => {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) { tg.expand(); tg.ready(); }

      const tgUser = tg?.initDataUnsafe?.user;
      const startParam = tg?.initDataUnsafe?.start_param;
      
      const db = getDB();
      const userId = tgUser?.id?.toString() || "dev_user";
      const username = tgUser?.username || "Guest";

      if (db[userId]) {
        setUser(db[userId]);
        return;
      }

      // مستخدم جديد
      const newUser: User = {
        id: userId,
        username: username,
        balance: 0,
        referrals: [],
        activeReferrals: [],
        referredBy: (startParam && startParam !== userId) ? startParam : undefined,
        miningState: { isActive: false },
        hasStartedFirstMining: false
      };

      // إذا جاء عن طريق رابط إحالة، نسجله عند المدعي
      if (newUser.referredBy && db[newUser.referredBy]) {
        if (!db[newUser.referredBy].referrals.includes(userId)) {
          db[newUser.referredBy].referrals.push(userId);
        }
      }

      db[userId] = newUser;
      saveDB(db);
      setUser(newUser);
    };
    init();
  }, []);

  // 2. تحديث عداد التعدين
  useEffect(() => {
    let interval: any;
    if (user?.miningState.isActive && user.miningState.startTime) {
      interval = setInterval(() => {
        const elapsed = Date.now() - user.miningState.startTime!;
        const remaining = Math.max(0, MINING_TIME - elapsed);
        const progress = Math.min(1, elapsed / MINING_TIME);
        
        setTimeLeft(remaining);
        setCurrentMined(progress * MINING_RATE);

        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [user?.miningState]);

  // 3. بدء التعدين وتفعيل المكافأة
  const startMining = () => {
    if (!user) return;
    const db = getDB();
    const updated = { ...user };
    
    updated.miningState = { isActive: true, startTime: Date.now() };

    // تفعيل مكافأة الإحالة للمدعي (عند أول ضغطة تعدين فقط)
    if (!updated.hasStartedFirstMining && updated.referredBy && db[updated.referredBy]) {
      const referrer = db[updated.referredBy];
      if (!referrer.activeReferrals.includes(updated.id)) {
        referrer.activeReferrals.push(updated.id);
        referrer.balance += REWARD_AMOUNT;
        db[updated.referredBy] = referrer;
      }
      updated.hasStartedFirstMining = true;
    }

    db[updated.id] = updated;
    saveDB(db);
    setUser(updated);
    
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
  };

  // 4. تحصيل الأرباح
  const collectMining = () => {
    if (!user) return;
    const db = getDB();
    const updated = { ...user };
    updated.balance += currentMined;
    updated.miningState = { isActive: false };
    
    db[updated.id] = updated;
    saveDB(db);
    setUser(updated);
    setCurrentMined(0);
    
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  };

  const formatTime = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleShare = () => {
    const link = `https://t.me/${BOT_USERNAME}/app?startapp=${user?.id}`;
    const text = "🚀 تعال عدن عملة TON مجاناً واسحبها فوراً! استعمل رابطي للهدايا:";
    const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
    (window as any).Telegram?.WebApp?.openTelegramLink(url);
  };

  if (!user) return <div className="h-screen flex items-center justify-center font-bold">LOADING NODE...</div>;

  return (
    <div className="max-w-md mx-auto min-h-screen p-4 flex flex-col">
      <header className="flex justify-between items-center mb-10 glass-card p-4 rounded-3xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#0088CC] rounded-full flex items-center justify-center font-black text-xs">TON</div>
          <span className="font-black text-2xl tracking-tighter">{user.balance.toFixed(5)}</span>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black text-[#00d2ff] uppercase tracking-widest">Active Node</p>
          <span className="text-xs font-bold opacity-60">@{user.username}</span>
        </div>
      </header>

      <main className="flex-grow">
        {tab === AppTab.MINING && (
          <div className="flex flex-col items-center space-y-10">
            <div className="text-center">
              <p className="text-[10px] uppercase font-black opacity-40 tracking-[0.3em] mb-1">Session Progress</p>
              <h2 className="text-5xl font-black text-white">{currentMined.toFixed(6)}</h2>
              <p className="text-xs font-bold text-[#00d2ff]">TON</p>
            </div>

            <div className="relative group">
              {user.miningState.isActive && <div className="absolute inset-0 bg-[#0088CC]/20 blur-[60px] animate-pulse rounded-full"></div>}
              <div className="w-64 h-64 glass-card rounded-full flex items-center justify-center border border-white/10 relative z-10 overflow-hidden shadow-2xl">
                {user.miningState.isActive && <div className="mining-wave" style={{ height: `${(1 - timeLeft/MINING_TIME)*100}%` }}></div>}
                <svg viewBox="0 0 100 100" className={`w-28 h-28 relative z-20 transition-all duration-1000 ${user.miningState.isActive ? 'animate-ton-pulse scale-110' : 'opacity-30 scale-90'}`}>
                  <circle cx="50" cy="50" r="45" fill="#0088CC" />
                  <path d="M50 25L25 45L50 75L75 45L50 25Z" fill="white" />
                </svg>
              </div>
            </div>

            <div className="w-full space-y-4 pt-4">
              <div className="text-center glass-card py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                {user.miningState.isActive ? `Time Left: ${formatTime(timeLeft)}` : "Engine Standby"}
              </div>
              <button 
                onClick={user.miningState.isActive ? collectMining : startMining}
                disabled={user.miningState.isActive && timeLeft > 0}
                className={`w-full py-6 rounded-3xl font-black text-xl shadow-2xl transition-all active:scale-95 ${user.miningState.isActive ? (timeLeft <= 0 ? 'bg-green-500 text-black' : 'bg-white/5 text-white/20') : 'bg-gradient-to-r from-[#00d2ff] to-[#0088CC] text-white'}`}
              >
                {user.miningState.isActive ? (timeLeft > 0 ? "Mining..." : "Collect TON") : "Start Mining ⚡"}
              </button>
            </div>
          </div>
        )}

        {tab === AppTab.FRIENDS && (
          <div className="space-y-6 animate-in slide-in-from-bottom-5">
            <div className="text-center p-4">
              <h2 className="text-3xl font-black">الأصدقاء 👥</h2>
              <p className="text-xs opacity-50">اربح {REWARD_AMOUNT} TON عن كل صديق ينشط المعدن</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-6 rounded-3xl text-center">
                <p className="text-[10px] opacity-40 font-black mb-1">Total Invites</p>
                <p className="text-2xl font-black">{user.referrals.length}</p>
              </div>
              <div className="glass-card p-6 rounded-3xl text-center border-[#00d2ff]/30">
                <p className="text-[10px] text-[#00d2ff] font-black mb-1">Active Friends</p>
                <p className="text-2xl font-black">{user.activeReferrals.length}</p>
              </div>
            </div>
            <div className="glass-card p-6 rounded-3xl space-y-4">
              <p className="text-xs text-center opacity-70 leading-relaxed">
                ستحصل على المكافأة بمجرد أن يقوم صديقك ببدء أول عملية تعدين له في التطبيق.
              </p>
              <button onClick={handleShare} className="w-full bg-white text-black py-4 rounded-2xl font-black active:scale-95 transition-all">دعوة صديق الآن 🔗</button>
            </div>
          </div>
        )}

        {tab === AppTab.TASKS && <div className="text-center py-20 opacity-30 italic">قريباً...</div>}
        {tab === AppTab.WALLET && <div className="text-center py-20 opacity-30 italic">قريباً...</div>}
      </main>

      <nav className="fixed bottom-8 left-6 right-6 glass-card p-2 rounded-[2.5rem] flex justify-around shadow-2xl z-50">
        {[
          { id: AppTab.MINING, icon: "💎", label: "Mining" },
          { id: AppTab.FRIENDS, icon: "👥", label: "Friends" },
          { id: AppTab.TASKS, icon: "🎯", label: "Tasks" },
          { id: AppTab.WALLET, icon: "🏦", label: "Wallet" }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex flex-col items-center px-5 py-3 rounded-[2rem] transition-all ${tab === t.id ? 'bg-[#0088CC] text-white shadow-lg' : 'opacity-30'}`}>
            <span className="text-xl mb-0.5">{t.icon}</span>
            <span className="text-[8px] font-black uppercase tracking-tighter">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
