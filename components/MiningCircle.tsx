
import React, { useState, useEffect } from 'react';

interface MiningCircleProps {
  hashRate: number;
  coinName: string;
  isMining: boolean;
}

export const MiningCircle: React.FC<MiningCircleProps> = ({ hashRate, coinName, isMining }) => {
  const [progress, setProgress] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [sessionProfit, setSessionProfit] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isMining) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
        setProgress(p => (p + 1.2) % 100); 
        
        const increment = (hashRate / 1000000);
        setSessionProfit(prev => prev + increment);
      }, 1000);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isMining, hashRate]);

  useEffect(() => {
    if (!isMining) {
      setSeconds(0);
      setSessionProfit(0);
    }
  }, [isMining]);

  const displaySeconds = seconds % 60;

  return (
    <div className="relative flex flex-col items-center justify-center p-8 bg-[#0a0a0a] rounded-[3rem] border border-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden">
      {/* Dynamic Background Aura */}
      {isMining && (
        <div className="absolute inset-0 bg-blue-600/10 animate-aura-dynamic blur-3xl rounded-full scale-150 pointer-events-none"></div>
      )}
      
      <div className={`relative w-64 h-64 flex items-center justify-center transition-transform duration-1000 ${isMining ? 'scale-105' : 'scale-100'}`}>
        
        {/* Orbital Particles Layer - Enhanced */}
        {isMining && (
          <div className="absolute inset-0 animate-spin-variable pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_15px_#3b82f6]"></div>
            <div className="absolute bottom-1/4 right-0 w-1.5 h-1.5 bg-cyan-300 rounded-full shadow-[0_0_10px_#22d3ee] opacity-80 animate-bounce"></div>
          </div>
        )}

        {/* SVG Progress Circle */}
        <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_10px_rgba(59,130,246,0.1)]">
          <defs>
            <linearGradient id="miningGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <filter id="strongGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          <circle
            cx="128"
            cy="128"
            r="110"
            stroke="currentColor"
            strokeWidth="6"
            fill="transparent"
            className="text-white/5"
          />

          {isMining && (
            <circle
              cx="128"
              cy="128"
              r="110"
              stroke="#3b82f6"
              strokeWidth="12"
              fill="transparent"
              strokeOpacity="0.2"
              className="animate-glow-variable"
            />
          )}

          <circle
            cx="128"
            cy="128"
            r="110"
            stroke="url(#miningGradient)"
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={690}
            strokeDashoffset={690 - (690 * progress) / 100}
            strokeLinecap="round"
            filter={isMining ? "url(#strongGlow)" : "none"}
            className={`transition-all duration-700 ease-out ${isMining ? 'opacity-100' : 'text-gray-700 opacity-30'}`}
          />
        </svg>

        <div className={`absolute inset-0 flex flex-col items-center justify-center text-center z-10 transition-all duration-700 ${isMining ? 'translate-y-0' : 'translate-y-1'}`}>
          <div className={`mb-1 text-[10px] font-black tracking-[0.4em] uppercase transition-colors duration-500 ${isMining ? 'text-blue-400' : 'text-gray-600'}`}>
            {isMining ? 'NODE ACTIVE' : 'NODE IDLE'}
          </div>
          <div className={`text-6xl font-black tracking-tighter tabular-nums transition-all duration-500 ${isMining ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-gray-500'}`}>
            {displaySeconds < 10 ? `0${displaySeconds}` : displaySeconds}<span className="text-xl ml-0.5 opacity-60">s</span>
          </div>
          <div className="mt-3 flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
             <div className={`w-2 h-2 rounded-full ${isMining ? 'bg-blue-500 animate-ping' : 'bg-gray-700'}`}></div>
             <div className="text-gray-300 font-black text-xs tracking-tight">{hashRate} <span className="text-[10px] text-gray-500">GH/s</span></div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="mt-12 grid grid-cols-2 gap-4 w-full px-2">
        <div className="bg-[#111] rounded-2xl p-4 border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-all">
          <div className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest">Live Yield</div>
          <div className="text-xl font-black text-emerald-400 tabular-nums">
            +{sessionProfit.toFixed(7)}
          </div>
          <div className="text-[9px] text-gray-600 font-bold uppercase mt-0.5">{coinName}</div>
        </div>
        <div className="bg-[#111] rounded-2xl p-4 border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-all">
          <div className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-widest">Uptime</div>
          <div className="text-xl font-black text-blue-400 tabular-nums">
            {Math.floor(seconds / 60)}<span className="text-xs ml-0.5">m</span> {seconds % 60}<span className="text-xs ml-0.5">s</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin-variable {
          0% { transform: rotate(0deg); animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }
          50% { transform: rotate(180deg); animation-timing-function: cubic-bezier(0.8, 0, 0.6, 1); }
          100% { transform: rotate(360deg); }
        }
        @keyframes glow-variable {
          0%, 100% { stroke-width: 12px; stroke-opacity: 0.1; }
          40% { stroke-width: 16px; stroke-opacity: 0.35; }
          70% { stroke-width: 14px; stroke-opacity: 0.2; }
        }
        @keyframes aura-dynamic {
          0%, 100% { opacity: 0.05; transform: scale(1.4) rotate(0deg); }
          33% { opacity: 0.12; transform: scale(1.55) rotate(120deg); }
          66% { opacity: 0.08; transform: scale(1.45) rotate(240deg); }
        }
        .animate-spin-variable {
          animation: spin-variable 10s infinite;
        }
        .animate-glow-variable {
          animation: glow-variable 3.5s ease-in-out infinite;
        }
        .animate-aura-dynamic {
          animation: aura-dynamic 12s linear infinite;
        }
      `}</style>
    </div>
  );
};
