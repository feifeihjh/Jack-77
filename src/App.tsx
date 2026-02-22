/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  User, 
  Cpu, 
  Info, 
  ChevronRight,
  Heart,
  Diamond,
  Club,
  Spade,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

// --- Types & Constants ---

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const WILD_RANK: Rank = '7';

// --- Utils ---

const createDeck = (): Card[] => {
  const deck: Card[] = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({
        id: `${rank}-${suit}`,
        suit,
        rank
      });
    });
  });
  return deck;
};

const shuffle = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

// --- Components ---

const SuitIcon = ({ suit, className }: { suit: Suit; className?: string }) => {
  switch (suit) {
    case 'hearts': return <Heart className={`fill-current ${className}`} />;
    case 'diamonds': return <Diamond className={`fill-current ${className}`} />;
    case 'clubs': return <Club className={`fill-current ${className}`} />;
    case 'spades': return <Spade className={`fill-current ${className}`} />;
  }
};

interface CardViewProps {
  card?: Card;
  isFaceDown?: boolean;
  onClick?: () => void;
  isPlayable?: boolean;
  className?: string;
  key?: React.Key;
}

const CardView = ({ 
  card, 
  isFaceDown = false, 
  onClick, 
  isPlayable = false,
  className = "" 
}: CardViewProps) => {
  const colorClass = card?.suit === 'hearts' || card?.suit === 'diamonds' ? 'text-red-600' : 'text-slate-900';

  if (isFaceDown) {
    return (
      <div 
        onClick={onClick}
        className={`w-16 h-24 sm:w-24 sm:h-36 rounded-lg border-2 border-white bg-indigo-600 shadow-lg flex items-center justify-center relative overflow-hidden ${className}`}
      >
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="w-10 h-16 sm:w-16 sm:h-24 border border-white/30 rounded flex items-center justify-center">
          <div className="text-white/50 font-bold text-xl sm:text-2xl italic">J77</div>
        </div>
      </div>
    );
  }

  if (!card) return null;

  return (
    <motion.div
      layoutId={card.id}
      onClick={onClick}
      whileHover={isPlayable ? { y: -20, scale: 1.05 } : {}}
      className={`
        w-16 h-24 sm:w-24 sm:h-36 rounded-lg bg-white shadow-md border border-slate-200 
        flex flex-col p-1 sm:p-2 relative cursor-pointer select-none
        ${isPlayable ? 'ring-2 ring-emerald-400 shadow-emerald-100' : ''}
        ${colorClass}
        ${className}
      `}
    >
      <div className="flex flex-col items-start leading-none">
        <span className="text-sm sm:text-lg font-bold">{card.rank}</span>
        <SuitIcon suit={card.suit} className="w-3 h-3 sm:w-4 sm:h-4" />
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        {card.rank === WILD_RANK ? (
          <div className="text-2xl sm:text-4xl font-black italic opacity-20">7</div>
        ) : (
          <SuitIcon suit={card.suit} className="w-6 h-6 sm:w-10 sm:h-10 opacity-80" />
        )}
      </div>

      <div className="flex flex-col items-end leading-none rotate-180">
        <span className="text-sm sm:text-lg font-bold">{card.rank}</span>
        <SuitIcon suit={card.suit} className="w-3 h-3 sm:w-4 sm:h-4" />
      </div>
    </motion.div>
  );
};

// --- Main Game Component ---

export default function App() {
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [aiHand, setAiHand] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [currentSuit, setCurrentSuit] = useState<Suit | null>(null);
  const [turn, setTurn] = useState<'player' | 'ai'>('player');
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameOver'>('start');
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null);
  const [showSuitPicker, setShowSuitPicker] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [message, setMessage] = useState("Welcome to Jack 7!");

  // --- Game Actions ---

  const initGame = () => {
    const fullDeck = shuffle(createDeck());
    const pHand = fullDeck.slice(0, 8);
    const aHand = fullDeck.slice(8, 16);
    let initialDiscard = fullDeck.slice(16, 17)[0];
    const remainingDeck = fullDeck.slice(17);

    // If initial discard is a 7, we need to pick a suit or just reshuffle
    // For simplicity, let's just make sure it's not a 7 for the first card
    let finalDeck = remainingDeck;
    let finalDiscard = initialDiscard;
    if (initialDiscard.rank === WILD_RANK) {
      const firstNonSevenIndex = remainingDeck.findIndex(c => c.rank !== WILD_RANK);
      if (firstNonSevenIndex !== -1) {
        finalDiscard = remainingDeck[firstNonSevenIndex];
        finalDeck = [...remainingDeck];
        finalDeck[firstNonSevenIndex] = initialDiscard;
      }
    }

    setPlayerHand(pHand);
    setAiHand(aHand);
    setDiscardPile([finalDiscard]);
    setDeck(finalDeck);
    setCurrentSuit(finalDiscard.suit);
    setTurn('player');
    setGameState('playing');
    setWinner(null);
    setMessage("Your turn! Match suit or rank.");
  };

  const checkWin = (hand: Card[], who: 'player' | 'ai') => {
    if (hand.length === 0) {
      setGameState('gameOver');
      setWinner(who);
      if (who === 'player') {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
      return true;
    }
    return false;
  };

  const playCard = (card: Card, who: 'player' | 'ai', newSuit?: Suit): void => {
    const topCard = discardPile[discardPile.length - 1];
    const isWild = card.rank === WILD_RANK;
    
    // Validation
    if (!isWild && card.suit !== currentSuit && card.rank !== topCard.rank) {
      return;
    }

    // Execute Play
    if (who === 'player') {
      const newHand = playerHand.filter(c => c.id !== card.id);
      setPlayerHand(newHand);
      if (checkWin(newHand, 'player')) return;
    } else {
      const newHand = aiHand.filter(c => c.id !== card.id);
      setAiHand(newHand);
      if (checkWin(newHand, 'ai')) return;
    }

    setDiscardPile(prev => [...prev, card]);
    
    if (isWild) {
      if (newSuit) {
        setCurrentSuit(newSuit);
        setMessage(`${who === 'player' ? 'You' : 'AI'} played a 7 and changed suit to ${newSuit}!`);
        setTurn(who === 'player' ? 'ai' : 'player');
      } else {
        // Player needs to pick
        setShowSuitPicker(true);
      }
    } else {
      setCurrentSuit(card.suit);
      setMessage(`${who === 'player' ? 'You' : 'AI'} played ${card.rank} of ${card.suit}.`);
      setTurn(who === 'player' ? 'ai' : 'player');
    }
  };

  const drawCard = (who: 'player' | 'ai') => {
    if (deck.length === 0) {
      setMessage("Deck is empty! Turn skipped.");
      setTurn(who === 'player' ? 'ai' : 'player');
      return;
    }

    const newCard = deck[0];
    const remainingDeck = deck.slice(1);
    setDeck(remainingDeck);

    if (who === 'player') {
      setPlayerHand(prev => [...prev, newCard]);
      setMessage("You drew a card.");
    } else {
      setAiHand(prev => [...prev, newCard]);
      setMessage("AI drew a card.");
    }

    // After drawing, check if playable? 
    // Usually in Crazy Eights, you draw and if you can play, you can. 
    // But simple version: draw ends turn or just adds to hand.
    // Let's go with: draw and then it's still your turn to try and play it? 
    // Actually, standard rule is draw 1 and if still can't play, turn ends.
    
    const topCard = discardPile[discardPile.length - 1];
    const canPlayNew = newCard.rank === WILD_RANK || newCard.suit === currentSuit || newCard.rank === topCard.rank;
    
    if (!canPlayNew) {
      setTurn(who === 'player' ? 'ai' : 'player');
    }
  };

  // --- AI Logic ---

  useEffect(() => {
    if (gameState === 'playing' && turn === 'ai' && !winner) {
      const timer = setTimeout(() => {
        const topCard = discardPile[discardPile.length - 1];
        
        // 1. Try to play a normal card
        const playableNormal = aiHand.find(c => c.rank !== WILD_RANK && (c.suit === currentSuit || c.rank === topCard.rank));
        
        if (playableNormal) {
          playCard(playableNormal, 'ai');
        } else {
          // 2. Try to play a 7
          const wildCard = aiHand.find(c => c.rank === WILD_RANK);
          if (wildCard) {
            // AI picks most frequent suit in its hand
            const suitCounts: Record<Suit, number> = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
            aiHand.forEach(c => { if (c.rank !== WILD_RANK) suitCounts[c.suit]++; });
            const bestSuit = (Object.keys(suitCounts) as Suit[]).reduce((a, b) => suitCounts[a] > suitCounts[b] ? a : b);
            playCard(wildCard, 'ai', bestSuit);
          } else {
            // 3. Draw
            drawCard('ai');
          }
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [turn, gameState, aiHand, discardPile, currentSuit, winner]);

  // --- Render Helpers ---

  const topDiscard = discardPile[discardPile.length - 1];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans selection:bg-indigo-100 flex flex-col items-center justify-center p-4 overflow-hidden">
      
      {/* Header */}
      <header className="w-full max-w-5xl flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-200">
            J77
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Jack 77</h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Crazy Sevens Edition</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setGameState('start')}
            className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600"
            title="Restart Game"
          >
            <RotateCcw size={20} />
          </button>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-200">
            <Info size={14} className="text-indigo-500" />
            <span className="text-xs font-semibold text-slate-600">7s are Wild!</span>
          </div>
        </div>
      </header>

      <main className="w-full max-w-5xl flex-1 flex flex-col gap-8 relative">
        
        {gameState === 'start' ? (
          <div className="flex-1 flex flex-col items-center justify-center relative">
            {/* Background Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div 
                animate={{ 
                  rotate: [0, 10, 0],
                  y: [0, -20, 0]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-20 -left-20 w-64 h-96 bg-indigo-500/10 rounded-3xl blur-3xl"
              />
              <motion.div 
                animate={{ 
                  rotate: [0, -10, 0],
                  y: [0, 20, 0]
                }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-20 -right-20 w-64 h-96 bg-emerald-500/10 rounded-3xl blur-3xl"
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl w-full px-4">
              {/* Left Side: Hero Content */}
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-left"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-6">
                  <Trophy size={14} />
                  <span>Classic Card Game</span>
                </div>
                <h1 className="text-6xl sm:text-8xl font-black text-slate-900 leading-tight mb-6 tracking-tighter">
                  JACK <span className="text-indigo-600 italic">77</span>
                </h1>
                <p className="text-xl text-slate-500 mb-10 max-w-lg leading-relaxed">
                  体验最刺激的纸牌对决。匹配花色或点数，巧妙运用“万能7点”反败为胜。
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={initGame}
                    className="px-8 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-3 group text-lg"
                  >
                    立即开始游戏
                    <ChevronRight size={22} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button 
                    onClick={() => setShowRules(true)}
                    className="px-8 py-5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 text-lg"
                  >
                    查看规则
                  </button>
                </div>

                <div className="mt-12 flex items-center gap-8">
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-slate-900">52</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">标准扑克</span>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-slate-900">∞</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">无限乐趣</span>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-slate-900">AI</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">智能对手</span>
                  </div>
                </div>
              </motion.div>

              {/* Right Side: Visuals */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="relative hidden lg:block"
              >
                <div className="relative z-10 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: [-5, -10, -5] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -translate-x-16 -translate-y-8"
                  >
                    <CardView card={{ id: 'A-spades', suit: 'spades', rank: 'A' }} className="shadow-2xl scale-110" />
                  </motion.div>
                  <motion.div
                    animate={{ rotate: [5, 10, 5] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    className="absolute translate-x-16 translate-y-8"
                  >
                    <CardView card={{ id: 'K-hearts', suit: 'hearts', rank: 'K' }} className="shadow-2xl scale-110" />
                  </motion.div>
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <CardView card={{ id: '7-diamonds', suit: 'diamonds', rank: '7' }} className="shadow-2xl scale-125 z-20 ring-4 ring-indigo-500 ring-offset-4" />
                  </motion.div>
                </div>
                
                {/* Decorative Circles */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-100 rounded-full -z-10 blur-2xl opacity-50" />
              </motion.div>
            </div>
          </div>
        ) : (
          <>
            {/* AI Hand */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Cpu size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Opponent ({aiHand.length})</span>
              </div>
              <div className="flex -space-x-8 sm:-space-x-12">
                {aiHand.map((card, i) => (
                  <motion.div
                    key={card.id}
                    initial={{ scale: 0, x: -100 }}
                    animate={{ scale: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <CardView isFaceDown className="shadow-lg" />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Center Area: Deck & Discard */}
            <div className="flex-1 flex items-center justify-center gap-8 sm:gap-16">
              {/* Draw Pile */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group">
                  {deck.length > 0 && (
                    <div className="absolute -top-1 -left-1 w-16 h-24 sm:w-24 sm:h-36 rounded-lg bg-indigo-800 border-2 border-white translate-x-1 translate-y-1" />
                  )}
                  <CardView 
                    isFaceDown 
                    onClick={() => turn === 'player' && !showSuitPicker && drawCard('player')}
                    className={`
                      ${turn === 'player' && !showSuitPicker ? 'cursor-pointer hover:-translate-y-1 transition-transform ring-2 ring-indigo-400 ring-offset-4' : 'opacity-50'}
                    `}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Deck: {deck.length}</span>
              </div>

              {/* Discard Pile */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={topDiscard.id}
                      initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      exit={{ scale: 1.2, opacity: 0 }}
                    >
                      <CardView card={topDiscard} />
                    </motion.div>
                  </AnimatePresence>
                  
                  {/* Current Suit Indicator (if changed by 7) */}
                  {currentSuit && (
                    <div className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full shadow-lg border border-slate-100 flex items-center justify-center">
                      <SuitIcon suit={currentSuit} className={`w-6 h-6 ${currentSuit === 'hearts' || currentSuit === 'diamonds' ? 'text-red-500' : 'text-slate-800'}`} />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Discard</span>
              </div>
            </div>

            {/* Status Message */}
            <div className="flex justify-center">
              <motion.div 
                key={message}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-6 py-2 bg-white rounded-full shadow-sm border border-slate-200 flex items-center gap-3"
              >
                {turn === 'ai' ? <Cpu size={14} className="animate-pulse text-indigo-500" /> : <User size={14} className="text-emerald-500" />}
                <span className="text-sm font-medium text-slate-600">{message}</span>
              </motion.div>
            </div>

            {/* Player Hand */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-slate-400">
                <User size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Your Hand ({playerHand.length})</span>
              </div>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-4 max-w-3xl">
                {playerHand.map((card) => {
                  const isPlayable = turn === 'player' && !showSuitPicker && (
                    card.rank === WILD_RANK || 
                    card.suit === currentSuit || 
                    card.rank === topDiscard.rank
                  );
                  return (
                    <CardView 
                      key={card.id} 
                      card={card} 
                      isPlayable={isPlayable}
                      onClick={() => {
                        if (isPlayable) playCard(card, 'player');
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Suit Picker Overlay */}
        <AnimatePresence>
          {showSuitPicker && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm text-center"
              >
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="text-amber-600 w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">Wild 7 Played!</h3>
                <p className="text-slate-500 mb-8">Choose the new suit to continue the game.</p>
                
                <div className="grid grid-cols-2 gap-4">
                  {SUITS.map(suit => (
                    <button
                      key={suit}
                      onClick={() => {
                        const lastPlayed = discardPile[discardPile.length - 1];
                        setCurrentSuit(suit);
                        setShowSuitPicker(false);
                        setMessage(`You changed the suit to ${suit}!`);
                        setTurn('ai');
                      }}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                    >
                      <SuitIcon suit={suit} className={`w-8 h-8 ${suit === 'hearts' || suit === 'diamonds' ? 'text-red-500' : 'text-slate-800'} group-hover:scale-110 transition-transform`} />
                      <span className="text-xs font-bold capitalize text-slate-600">{suit}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Over Overlay */}
        <AnimatePresence>
          {gameState === 'gameOver' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white p-10 rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md text-center"
              >
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 ${winner === 'player' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {winner === 'player' ? (
                    <Trophy className="text-emerald-600 w-12 h-12" />
                  ) : (
                    <AlertCircle className="text-red-600 w-12 h-12" />
                  )}
                </div>
                <h2 className="text-3xl font-black mb-2">
                  {winner === 'player' ? 'Victory!' : 'Defeat!'}
                </h2>
                <p className="text-slate-500 mb-10 leading-relaxed">
                  {winner === 'player' 
                    ? 'Amazing skills! You cleared your hand and won the game.' 
                    : 'The AI was faster this time. Better luck in the next round!'}
                </p>
                
                <button 
                  onClick={() => setGameState('start')}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                >
                  Play Again
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
                className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">游戏规则</h2>
                  <button 
                    onClick={() => setShowRules(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                  >
                    <RotateCcw size={24} className="rotate-45" />
                  </button>
                </div>

                <div className="space-y-6 text-slate-600">
                  <section>
                    <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <div className="w-2 h-6 bg-indigo-500 rounded-full" />
                      基础玩法
                    </h3>
                    <p className="leading-relaxed">
                      游戏使用一副标准的52张扑克牌（不含大小王）。每位玩家初始分发 <strong>8张</strong> 手牌。
                    </p>
                  </section>

                  <section>
                    <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                      出牌规则
                    </h3>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                      <li>玩家轮流出牌。</li>
                      <li>所出的牌必须在 <strong>花色</strong> 或 <strong>点数</strong> 上与弃牌堆顶部的牌匹配。</li>
                      <li>如果无牌可出，必须从摸牌堆 <strong>摸一张牌</strong>。</li>
                      <li>如果摸到的牌可以立即打出，则可以出牌；否则回合结束。</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <div className="w-2 h-6 bg-amber-500 rounded-full" />
                      万能 7 点 (Crazy 7s)
                    </h3>
                    <p className="leading-relaxed">
                      数字 <strong>“7”</strong> 是万用牌。你可以在任何时候打出 7，并随后指定一个新的花色（红心、方块、梅花或黑桃）。
                    </p>
                  </section>

                  <section>
                    <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <div className="w-2 h-6 bg-rose-500 rounded-full" />
                      获胜条件
                    </h3>
                    <p className="leading-relaxed">
                      最先 <strong>清空手牌</strong> 的一方获得最终胜利！
                    </p>
                  </section>
                </div>

                <button 
                  onClick={() => setShowRules(false)}
                  className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors"
                >
                  我知道了
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mt-8 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Server Online</span>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest">v1.0.4 - Stable</div>
        </div>
        <p className="text-[10px] font-medium">© 2026 Jack 7 Card Games. All rights reserved.</p>
      </footer>
    </div>
  );
}
