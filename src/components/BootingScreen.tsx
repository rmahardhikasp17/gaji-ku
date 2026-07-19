import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface BootingScreenProps {
  dbReady: boolean;
  onComplete: () => void;
}

const BOOTING_MESSAGES = [
  { maxProgress: 25, message: "Menghubungkan Database..." },
  { maxProgress: 55, message: "Mengambil Konfigurasi..." },
  { maxProgress: 85, message: "Mempersiapkan Dashboard..." },
  { maxProgress: 100, message: "Sinkronisasi Data Selesai!" },
];

export const BootingScreen: React.FC<BootingScreenProps> = ({ dbReady, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(BOOTING_MESSAGES[0].message);

  useEffect(() => {
    const duration = 2700; // 2.7 seconds minimum loading time
    const intervalTime = 30; // ms
    const steps = duration / intervalTime;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          return 100;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  // Update booting message based on current progress
  useEffect(() => {
    const matched = BOOTING_MESSAGES.find((item) => progress <= item.maxProgress);
    if (matched) {
      setCurrentMessage(matched.message);
    }
  }, [progress]);

  // Handle completion when progress is 100% and database is ready
  useEffect(() => {
    if (progress === 100 && dbReady) {
      const delayTimeout = setTimeout(() => {
        onComplete();
      }, 500); // Small pause at 100% for smooth transition
      return () => clearTimeout(delayTimeout);
    }
  }, [progress, dbReady, onComplete]);

  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { type: "spring", duration: 1.8, bounce: 0 },
        opacity: { duration: 0.3 },
      },
    },
  };

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-slate-950 px-6 py-12 select-none overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Decorative Background Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15)_0%,transparent_65%)] pointer-events-none" />
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

      {/* Spacer to push content down */}
      <div className="h-10" />

      {/* Center Logo & Branding */}
      <div className="flex flex-col items-center text-center max-w-sm z-10">
        {/* Animated SVG Logo */}
        <div className="relative mb-8 p-6 rounded-3xl bg-slate-900/40 border border-slate-800/40 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
          {/* Neon inner glow layer */}
          <div className="absolute inset-0 rounded-3xl bg-emerald-500/5 opacity-50 blur-xl" />
          
          <svg
            viewBox="0 0 100 100"
            className="w-24 h-24 text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.35)]"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Hexagonal Shield Contour */}
            <motion.path
              d="M50 12 L82 30 V70 L50 88 L18 70 V30 Z"
              stroke="url(#hexGradient)"
              variants={pathVariants}
              initial="hidden"
              animate="visible"
            />
            {/* Inner Stylized Wallet / Growth "G" */}
            <motion.path
              d="M38 52 H60 A10 10 0 1 1 50 62 A10 10 0 0 1 50 50 Z"
              stroke="url(#walletGradient)"
              strokeWidth="4"
              variants={pathVariants}
              initial="hidden"
              animate="visible"
            />
            {/* Upward wealth line in top of shield */}
            <motion.path
              d="M38 35 L48 42 L62 30"
              stroke="#60a5fa"
              strokeWidth="3.5"
              variants={pathVariants}
              initial="hidden"
              animate="visible"
            />

            {/* Gradient Definitions */}
            <defs>
              <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#059669" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id="walletGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Text Shimmer Effect */}
        <style>{`
          @keyframes shimmerMove {
            0%   { background-position: 200% center; }
            100% { background-position: -200% center; }
          }
          .shimmer-text {
            animation: shimmerMove 3s linear infinite;
            background-image: linear-gradient(90deg, #e2e8f0 0%, #34d399 40%, #60a5fa 60%, #e2e8f0 100%);
            background-size: 200% auto;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
          }
        `}</style>
        <div className="flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="shimmer-text text-4xl font-extrabold tracking-wider"
          >
            Gaji-ku
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-xs tracking-[0.25em] text-slate-400 uppercase mt-2 font-medium"
          >
            Personal Financial Tracker
          </motion.p>
        </div>
      </div>

      {/* Booting Progress Indicator */}
      <div className="w-full max-w-xs flex flex-col items-center z-10">
        {/* Progress Bar Label */}
        <div className="w-full flex justify-between items-center mb-2 px-1 text-xs text-slate-400 font-medium">
          <span className="animate-pulse">{currentMessage}</span>
          <span className="text-emerald-400 font-semibold">{Math.round(progress)}%</span>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full h-1.5 rounded-full bg-slate-900 border border-slate-800/60 overflow-hidden p-[1px]">
          {/* Animated Progress Fill */}
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            style={{ width: `${progress}%` }}
            transition={{ type: "tween", ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Branding Logo & Powered By */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="flex flex-col items-center space-y-1 text-center z-10"
      >
        <span className="text-[10px] tracking-widest text-slate-500 uppercase">powered by</span>
        <span className="text-xs font-semibold text-slate-300 tracking-wider hover:text-emerald-400 transition-colors">
          Nekat Digital
        </span>
      </motion.div>
    </motion.div>
  );
};

export default BootingScreen;
