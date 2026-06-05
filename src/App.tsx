/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { CharacterSelect } from './components/CharacterSelect';
import { GameInterface } from './components/GameInterface';
import { Character, GameMode, Difficulty, ControlKeys, Stage, Weapon } from './types';
import { Swords, Trophy, Shield } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<'lobby' | 'fighting'>('lobby');
  const [gameConfig, setGameConfig] = useState<{
    p1Char: Character;
    p2Char: Character;
    p1Weapon: Weapon;
    p2Weapon: Weapon;
    mode: GameMode;
    difficulty: Difficulty;
    p2Keys: ControlKeys;
    stage: Stage;
  } | null>(null);

  const handleSelectionComplete = (config: {
    p1Char: Character;
    p2Char: Character;
    p1Weapon: Weapon;
    p2Weapon: Weapon;
    mode: GameMode;
    difficulty: Difficulty;
    p2Keys: ControlKeys;
    stage: Stage;
  }) => {
    setGameConfig(config);
    setGameState('fighting');
  };

  const handleExitToLobby = () => {
    setGameState('lobby');
  };

  return (
    <div className="min-h-screen bg-[#030006] text-gray-100 flex flex-col justify-between p-4 md:p-8 selection:bg-purple-500 selection:text-black">
      {/* Absolute Decorative Background Panels */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-purple-950/15 via-[#0c051a]/5 to-transparent pointer-events-none" />
      
      {/* Mini top navigation bar */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between py-2 border-b border-purple-950/20 mb-6 relative z-10 font-mono text-[10px] text-gray-500 uppercase tracking-widest">
        <div className="flex items-center gap-2 text-purple-400">
          <Swords className="w-4 h-4 animate-pulse" />
          <span>Street Duel Arena</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><Trophy className="w-3.5 h-3.5 text-yellow-500" /> Champions Run</span>
          <span className="hidden sm:inline-flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-cyan-400" /> Offline Secure</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow flex items-center justify-center w-full relative z-10 py-2">
        {gameState === 'lobby' ? (
          <CharacterSelect onSelectionComplete={handleSelectionComplete} />
        ) : (
          gameConfig && (
            <GameInterface
              p1Char={gameConfig.p1Char}
              p2Char={gameConfig.p2Char}
              p1Weapon={gameConfig.p1Weapon}
              p2Weapon={gameConfig.p2Weapon}
              mode={gameConfig.mode}
              difficulty={gameConfig.difficulty}
              p2Keys={gameConfig.p2Keys}
              stage={gameConfig.stage}
              onExit={handleExitToLobby}
            />
          )
        )}
      </main>

      {/* Humble, Professional Footer element */}
      <footer className="w-full max-w-4xl mx-auto text-center py-6 border-t border-purple-950/25 mt-8 relative z-10 font-mono text-[9px] text-[#52446d] tracking-widest uppercase">
        <span>Street Duel Fighting System © 2026 • Local 2P Arcade Station</span>
      </footer>
    </div>
  );
}
