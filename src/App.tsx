/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  Play, 
  Pause, 
  Info, 
  ChevronRight,
  Timer,
  Hash,
  AlertTriangle,
  Settings,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';

// --- Constants ---

const COLS = 6;
const MAX_ROWS = 10;
const INITIAL_ROWS = 4;
const TARGET_MIN = 10;
const TARGET_MAX = 25;
const BLOCK_MIN = 1;
const BLOCK_MAX = 9;

type GameMode = 'classic' | 'time';
type GameStatus = 'start' | 'playing' | 'paused' | 'gameOver';

interface Block {
  id: string;
  value: number;
  row: number;
  col: number;
}

// --- Utils ---

const generateId = () => Math.random().toString(36).substr(2, 9);

const getRandomInt = (min: number, max: number) => 
  Math.floor(Math.random() * (max - min + 1)) + min;

const createRow = (rowIndex: number): Block[] => {
  return Array.from({ length: COLS }, (_, colIndex) => ({
    id: generateId(),
    value: getRandomInt(BLOCK_MIN, BLOCK_MAX),
    row: rowIndex,
    col: colIndex,
  }));
};

// --- Components ---

const BlockView = ({ 
  block, 
  isSelected, 
  onClick, 
  isGameOver 
}: { 
  block: Block; 
  isSelected: boolean; 
  onClick: () => void;
  isGameOver: boolean;
}) => {
  return (
    <motion.button
      layout
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      disabled={isGameOver}
      className={`
        aspect-square w-full rounded-xl flex items-center justify-center text-2xl font-black shadow-lg transition-all
        ${isSelected 
          ? 'bg-indigo-600 text-white ring-4 ring-indigo-300 ring-offset-2 scale-105 z-10' 
          : 'bg-white text-slate-800 hover:bg-slate-50 border-2 border-slate-100'}
      `}
    >
      {block.value}
    </motion.button>
  );
};

// --- Main Game Component ---

export default function App() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [target, setTarget] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [mode, setMode] = useState<GameMode>('classic');
  const [status, setStatus] = useState<GameStatus>('start');
  const [timeLeft, setTimeLeft] = useState(15);
  const [showRules, setShowRules] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Game Logic ---

  const initGame = (selectedMode: GameMode) => {
    let initialBlocks: Block[] = [];
    for (let r = 0; r < INITIAL_ROWS; r++) {
      initialBlocks = [...initialBlocks, ...createRow(r)];
    }
    setBlocks(initialBlocks);
    setTarget(getRandomInt(TARGET_MIN, TARGET_MAX));
    setScore(0);
    setLevel(1);
    setMode(selectedMode);
    setStatus('playing');
    setSelectedIds([]);
    setTimeLeft(15);
  };

  const addNewRow = useCallback(() => {
    setBlocks(prev => {
      // Shift all existing blocks up
      const shifted = prev.map(b => ({ ...b, row: b.row + 1 }));
      
      // Check for overflow
      if (shifted.some(b => b.row >= MAX_ROWS)) {
        setStatus('gameOver');
        return shifted;
      }

      // Add new row at bottom (row 0)
      const newRow = createRow(0);
      return [...shifted, ...newRow];
    });
    
    if (mode === 'time') {
      setTimeLeft(Math.max(5, 15 - Math.floor(level / 2)));
    }
  }, [mode, level]);

  const handleBlockClick = (id: string) => {
    if (status !== 'playing') return;

    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      return [...prev, id];
    });
  };

  // Check sum
  useEffect(() => {
    const selectedBlocks = blocks.filter(b => selectedIds.includes(b.id));
    const currentSum = selectedBlocks.reduce((acc, b) => acc + b.value, 0);

    if (currentSum === target) {
      // Success!
      setScore(prev => prev + (selectedIds.length * 10 * level));
      setBlocks(prev => prev.filter(b => !selectedIds.includes(b.id)));
      setSelectedIds([]);
      setTarget(getRandomInt(TARGET_MIN, TARGET_MAX));
      
      if (mode === 'classic') {
        addNewRow();
      } else {
        // In time mode, reset timer on success
        setTimeLeft(Math.max(5, 15 - Math.floor(level / 2)));
      }

      // Level up every 500 points
      if (score > level * 500) {
        setLevel(prev => prev + 1);
      }
    } else if (currentSum > target) {
      // Exceeded target, reset selection
      setSelectedIds([]);
    }
  }, [selectedIds, target, blocks, mode, addNewRow, level, score]);

  // Timer logic for Time Mode
  useEffect(() => {
    if (status === 'playing' && mode === 'time') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            addNewRow();
            return Math.max(5, 15 - Math.floor(level / 2));
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, mode, addNewRow, level]);

  // --- Render ---

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 flex flex-col items-center p-4 overflow-hidden">
      
      {/* Header */}
      <header className="w-full max-w-2xl flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Hash size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">数字消除大师</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">数学求和益智挑战</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowRules(true)}
            className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <Info size={20} />
          </button>
          {status === 'playing' && (
            <button 
              onClick={() => setStatus('paused')}
              className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600"
            >
              <Pause size={20} />
            </button>
          )}
        </div>
      </header>

      <main className="w-full max-w-2xl flex-1 flex flex-col gap-6 relative">
        
        {status === 'start' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-200 w-full max-w-md"
            >
              <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <Trophy className="text-indigo-600 w-10 h-10" />
              </div>
              <h2 className="text-3xl font-black mb-4">选择模式</h2>
              <p className="text-slate-500 mb-10 leading-relaxed">
                组合数字以达到目标值。不要让方块触碰到顶部红线！
              </p>
              
              <div className="space-y-4">
                <button 
                  onClick={() => initGame('classic')}
                  className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-3 group"
                >
                  经典模式
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={() => initGame('time')}
                  className="w-full py-5 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-100 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 group"
                >
                  计时挑战
                  <Timer size={20} className="text-rose-500" />
                </button>
              </div>
            </motion.div>
          </div>
        ) : (
          <>
            {/* Game Info Bar */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">目标数字</span>
                <span className="text-3xl font-black text-indigo-600">{target}</span>
              </div>
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">当前得分</span>
                <span className="text-3xl font-black text-slate-800">{score}</span>
              </div>
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  {mode === 'classic' ? '当前等级' : '剩余时间'}
                </span>
                <span className={`text-3xl font-black ${mode === 'time' && timeLeft <= 5 ? 'text-rose-500 animate-pulse' : 'text-slate-800'}`}>
                  {mode === 'classic' ? level : timeLeft}
                </span>
              </div>
            </div>

            {/* Current Selection Sum */}
            <div className="flex justify-center">
              <div className="px-6 py-2 bg-indigo-50 rounded-full border border-indigo-100 text-indigo-600 font-bold text-sm">
                当前选中总和: {blocks.filter(b => selectedIds.includes(b.id)).reduce((acc, b) => acc + b.value, 0)}
              </div>
            </div>

            {/* Game Grid */}
            <div className="flex-1 bg-white rounded-[2.5rem] p-4 shadow-inner border border-slate-200 relative overflow-hidden">
              <div className="grid grid-cols-6 gap-2 h-full content-end">
                <AnimatePresence mode="popLayout">
                  {blocks.map((block) => (
                    <div 
                      key={block.id} 
                      style={{ 
                        gridColumn: block.col + 1,
                        gridRow: MAX_ROWS - block.row
                      }}
                    >
                      <BlockView 
                        block={block}
                        isSelected={selectedIds.includes(block.id)}
                        onClick={() => handleBlockClick(block.id)}
                        isGameOver={status === 'gameOver'}
                      />
                    </div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Danger Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500/20" />
            </div>
          </>
        )}

        {/* Paused Overlay */}
        <AnimatePresence>
          {status === 'paused' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl text-center max-w-xs w-full">
                <h2 className="text-3xl font-black mb-8">游戏暂停</h2>
                <div className="space-y-4">
                  <button 
                    onClick={() => setStatus('playing')}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
                  >
                    <Play size={20} /> 继续游戏
                  </button>
                  <button 
                    onClick={() => setStatus('start')}
                    className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={20} /> 退出游戏
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Over Overlay */}
        <AnimatePresence>
          {status === 'gameOver' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white p-10 rounded-[2.5rem] shadow-2xl text-center max-w-md w-full"
              >
                <div className="w-20 h-20 bg-rose-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="text-rose-600 w-10 h-10" />
                </div>
                <h2 className="text-4xl font-black mb-2">游戏结束</h2>
                <p className="text-slate-500 mb-8">方块触碰到了顶部红线！</p>
                
                <div className="bg-slate-50 p-6 rounded-3xl mb-8 flex justify-around">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">最终得分</span>
                    <span className="text-3xl font-black text-slate-800">{score}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">最终等级</span>
                    <span className="text-3xl font-black text-slate-800">{level}</span>
                  </div>
                </div>

                <button 
                  onClick={() => setStatus('start')}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                >
                  再试一次
                  <RotateCcw size={20} />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rules Modal */}
        <AnimatePresence>
          {showRules && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[60] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-black tracking-tight">游戏规则</h2>
                  <button 
                    onClick={() => setShowRules(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex-shrink-0 flex items-center justify-center text-indigo-600 font-bold">1</div>
                    <div>
                      <h3 className="font-bold mb-1">匹配目标值</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">从网格中选择数字。它们的总和必须正好等于顶部显示的目标数字。</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex-shrink-0 flex items-center justify-center text-emerald-600 font-bold">2</div>
                    <div>
                      <h3 className="font-bold mb-1">消除方块</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">一旦匹配成功，选中的方块会消失。不要让方块堆积到顶部的红线！</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex-shrink-0 flex items-center justify-center text-amber-600 font-bold">3</div>
                    <div>
                      <h3 className="font-bold mb-1">游戏模式</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        <strong>经典模式：</strong> 每次成功匹配后，底部会新增一行。<br/>
                        <strong>计时挑战：</strong> 如果倒计时结束仍未匹配，将强制新增一行。
                      </p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowRules(false)}
                  className="w-full mt-10 py-4 bg-slate-900 text-white rounded-2xl font-bold"
                >
                  准备好了！
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Footer */}
      <footer className="w-full max-w-2xl mt-6 pt-6 border-t border-slate-200 flex items-center justify-between text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Online</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest">v1.2.0</span>
        </div>
        <p className="text-[10px] font-medium">© 2026 数字消除大师 益智游戏</p>
      </footer>
    </div>
  );
}
