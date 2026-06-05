/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CHARACTERS, STAGES, DEFAULT_P1_KEYS, DEFAULT_P2_KEYS, LAPTOP_P2_KEYS } from '../data';
import { Character, GameMode, Difficulty, ControlKeys, Stage, Weapon } from '../types';
import { sfx } from '../utils/audio';
import { Swords, Laptop, Keyboard, Info, Play, Trophy, Settings } from 'lucide-react';

interface CharacterSelectProps {
  onSelectionComplete: (config: {
    p1Char: Character;
    p2Char: Character;
    p1Weapon: Weapon;
    p2Weapon: Weapon;
    mode: GameMode;
    difficulty: Difficulty;
    p2Keys: ControlKeys;
    stage: Stage;
  }) => void;
}

export const CharacterSelect: React.FC<CharacterSelectProps> = ({ onSelectionComplete }) => {
  const [mode, setMode] = useState<GameMode>('PvE');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [useLaptopControls, setUseLaptopControls] = useState<boolean>(true);
  
  const [p1Index, setP1Index] = useState<number>(0);
  const [p2Index, setP2Index] = useState<number>(1);
  const [p1WeaponIdx, setP1WeaponIdx] = useState<number>(0);
  const [p2WeaponIdx, setP2WeaponIdx] = useState<number>(0);
  const [selectedStageIdx, setSelectedStageIdx] = useState<number>(0);
  const [showConfig, setShowConfig] = useState<boolean>(false);

  const handleP1Select = (idx: number) => {
    sfx.playChime();
    setP1Index(idx);
    setP1WeaponIdx(0); // Reset weapon to first selectable for new fighter
    if (mode === 'PvE' || mode === 'Training') {
      // Auto assign non-coinciding character for AI as a starting default
      if (idx === p2Index) {
        const nextP2 = (idx + 1) % CHARACTERS.length;
        setP2Index(nextP2);
        setP2WeaponIdx(0);
      }
    }
  };

  const handleP2Select = (idx: number) => {
    sfx.playChime();
    setP2Index(idx);
    setP2WeaponIdx(0); // Reset weapon for new fighter
  };

  const handleStartGame = () => {
    sfx.playSpecialFire();
    const activeP1 = CHARACTERS[p1Index];
    const activeP2 = CHARACTERS[p2Index];
    onSelectionComplete({
      p1Char: activeP1,
      p2Char: activeP2,
      p1Weapon: activeP1.weapons[p1WeaponIdx] || activeP1.weapons[0],
      p2Weapon: activeP2.weapons[p2WeaponIdx] || activeP2.weapons[0],
      mode,
      difficulty,
      p2Keys: useLaptopControls ? LAPTOP_P2_KEYS : DEFAULT_P2_KEYS,
      stage: STAGES[selectedStageIdx],
    });
  };

  const renderStatBar = (val: number, color: string) => {
    return (
      <div className="flex gap-1 h-3 mt-1 items-center">
        {[1, 2, 3, 4, 5].map((step) => (
          <div
            key={step}
            className="h-full w-4 rounded-xs transition-all duration-300"
            style={{
              backgroundColor: step <= val ? color : '#1e1b29',
              boxShadow: step <= val ? `0 0 4px ${color}` : 'none',
            }}
          />
        ))}
      </div>
    );
  };

  const p1Char = CHARACTERS[p1Index];
  const p2Char = CHARACTERS[p2Index];

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 bg-[#000002]/95 border-2 border-purple-500/30 rounded-xl shadow-2xl relative overflow-hidden font-mono text-gray-200">
      {/* Absolute Decorative Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,10,36,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(18,10,36,0.1)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-40" />

      {/* Header */}
      <div className="text-center mb-6 relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-950/40 border border-purple-500/20 rounded-full text-xs text-purple-400 mb-2 uppercase tracking-[0.2em]">
          <Swords className="w-4 h-4 animate-pulse" />
          Arcade Lobby
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-orange-400 uppercase drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
          Street Duel
        </h1>
        <p className="text-xs text-gray-400 mt-2 tracking-wide uppercase">
          Select Fighter & Setup Match Options
        </p>
      </div>

      {/* Mode Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 relative z-10">
        <button
          onClick={() => { setMode('PvE'); sfx.playChime(); }}
          className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 ${
            mode === 'PvE' ? 'bg-purple-950/40 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-[#0f0a1c] border-purple-900/40 hover:border-purple-800'
          }`}
        >
          <div className="text-left">
            <h3 className="font-bold text-sm tracking-widest text-cyan-400 uppercase">SOLO RUN</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Vs Computer AI System</p>
          </div>
          <Trophy className={`w-5 h-5 ${mode === 'PvE' ? 'text-cyan-400' : 'text-gray-600'}`} />
        </button>

        <button
          onClick={() => { setMode('PvP'); sfx.playChime(); }}
          className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 ${
            mode === 'PvP' ? 'bg-purple-950/40 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-[#0f0a1c] border-purple-900/40 hover:border-purple-800'
          }`}
        >
          <div className="text-left">
            <h3 className="font-bold text-sm tracking-widest text-purple-400 uppercase">VERSUS DUEL</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Same Device Local 2P</p>
          </div>
          <Swords className={`w-5 h-5 ${mode === 'PvP' ? 'text-purple-400' : 'text-gray-600'}`} />
        </button>

        <button
          onClick={() => { setMode('Training'); sfx.playChime(); }}
          className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 ${
            mode === 'Training' ? 'bg-purple-950/40 border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'bg-[#0f0a1c] border-purple-900/40 hover:border-purple-800'
          }`}
        >
          <div className="text-left">
            <h3 className="font-bold text-sm tracking-widest text-yellow-500 uppercase">TRAINING</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Practice Room / Target Dummy</p>
          </div>
          <Info className={`w-5 h-5 ${mode === 'Training' ? 'text-yellow-500' : 'text-gray-600'}`} />
        </button>
      </div>

      {/* Dynamic Stage Selection Block */}
      <div className="mb-6 bg-[#090515]/80 border border-purple-900/40 rounded-xl p-4 relative z-10">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-3 text-purple-400 flex items-center gap-1.5">
          ⛰️ SELECT BATTLE ARENA
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {STAGES.map((stageItem, sIdx) => {
            const isSelected = selectedStageIdx === sIdx;
            return (
              <button
                key={stageItem.id}
                onClick={() => { setSelectedStageIdx(sIdx); sfx.playChime(); }}
                className={`p-3 rounded-lg border-2 text-left transition-all duration-200 relative overflow-hidden group ${
                  isSelected
                    ? 'bg-[#180a2b] border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.35)] font-bold text-white'
                    : 'bg-[#0f0a1c] border-purple-900/40 hover:border-purple-800'
                }`}
              >
                {/* Visual Sky Gradient Mimic in selection bg */}
                <div className="absolute inset-0 opacity-10 pointer-events-none transition-all duration-300 group-hover:opacity-20" style={{ background: `linear-gradient(to bottom, ${stageItem.skyTop}, ${stageItem.skyBottom})` }} />
                
                <span className="font-bold text-xs tracking-wider uppercase block relative z-10" style={{ color: isSelected ? '#ffffff' : stageItem.neonLine }}>
                  {stageItem.name}
                </span>
                <span className="text-[9px] text-gray-400 mt-1 block relative z-10 leading-tight">
                  {stageItem.tagline}
                </span>
                <span className="text-[8px] text-gray-500 block mt-2.5 relative z-10 tracking-widest uppercase">
                  {stageItem.particleType === 'blossom' ? '✿ CHERRY BLOSSOMS' : stageItem.particleType === 'rain' ? '✦ LIGHTNING STORM' : '🔥 SPARKS & LAVA'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Selection Area */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch relative z-10">
        {/* P1 Select Card */}
        <div className="md:col-span-4 bg-[#0a0515]/90 border border-purple-950 rounded-xl p-4 flex flex-col justify-between" style={{ borderColor: `${p1Char.color}44` }}>
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-purple-950/60 mb-3">
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">PLAYER 1</span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-cyan-950/30 border border-cyan-800/30 text-cyan-300 rounded">ACTIVE</span>
            </div>
            
            {/* Visual Portrait */}
            <div className="aspect-[4/3] rounded-lg relative overflow-hidden flex items-center justify-center mb-3 border border-purple-950 bg-gradient-to-b from-[#140b2a] to-[#040108]">
              <div className="absolute inset-0 opacity-10" style={{ background: p1Char.color }} />
              
              {/* Dynamic Retro Silhouette Figure */}
              <div 
                className="w-14 h-24 rounded-md relative flex flex-col items-center justify-center transition-all duration-300 transform group-hover:scale-110"
                style={{
                  backgroundColor: p1Char.color,
                  boxShadow: `0 0 20px ${p1Char.color}`,
                }}
              >
                {/* Eyes in preview */}
                <div className="absolute top-2 flex justify-between w-6">
                  <div className="w-1 h-1 bg-white" />
                  <div className="w-1 h-1 bg-white" />
                </div>
                {/* Visual energy lines */}
                <div className="w-10 h-0.5 bg-[#ffffff55] absolute top-10" />
                <div className="w-8 h-1 bg-[#ffffff44] absolute bottom-4 animate-bounce" />
              </div>
              
              <div className="absolute bottom-2 left-2 text-left">
                <h4 className="text-xl font-bold tracking-tight uppercase" style={{ color: p1Char.color }}>{p1Char.name}</h4>
                <p className="text-[9px] text-gray-500">{p1Char.title}</p>
              </div>
            </div>

            {/* Character Info Box */}
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-purple-400 font-bold uppercase block mb-1.5">🗡️ SELECT WEAPON LOADOUT</span>
                <div className="space-y-1.5">
                  {p1Char.weapons.map((w, wIdx) => {
                    const isSelected = p1WeaponIdx === wIdx;
                    return (
                      <button
                        key={w.id}
                        onClick={() => { setP1WeaponIdx(wIdx); sfx.playChime(); }}
                        className={`w-full p-2 rounded-lg text-left transition-all border leading-tight ${
                          isSelected
                            ? 'bg-purple-950/40 border-cyan-400 text-white shadow-[0_0_8px_rgba(6,182,212,0.25)] font-semibold'
                            : 'bg-[#0a0515]/30 border-purple-950 text-gray-400 hover:border-purple-900 hover:text-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[11px]">
                          <span style={{ color: isSelected ? p1Char.color : undefined }}>{w.name}</span>
                          <span className="text-[8px] text-gray-500 uppercase px-1 py-0.2 bg-purple-950/40 rounded">{w.type}</span>
                        </div>
                        <p className="text-[9px] text-gray-500 mt-0.5 leading-tight">{w.description}</p>
                        <div className="flex gap-2 text-[8px] font-mono mt-1 text-gray-400">
                          {w.bonusPower !== 0 && (
                            <span className={w.bonusPower > 0 ? 'text-green-400' : 'text-red-400'}>
                              PWR {w.bonusPower > 0 ? `+${w.bonusPower}` : w.bonusPower}
                            </span>
                          )}
                          {w.bonusSpeed !== 0 && (
                            <span className={w.bonusSpeed > 0 ? 'text-green-400' : 'text-red-400'}>
                              SPD {w.bonusSpeed > 0 ? `+${w.bonusSpeed}` : w.bonusSpeed}
                            </span>
                          )}
                          {w.bonusDefense !== 0 && (
                            <span className={w.bonusDefense > 0 ? 'text-green-400' : 'text-red-400'}>
                              DEF {w.bonusDefense > 0 ? `+${w.bonusDefense}` : w.bonusDefense}
                            </span>
                          )}
                          {w.bonusRange !== 0 && (
                            <span className={w.bonusRange > 0 ? 'text-green-400' : 'text-red-400'}>
                              RNG {w.bonusRange > 0 ? `+${w.bonusRange}` : w.bonusRange}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="pt-1.5 border-t border-purple-950/45">
                <span className="text-[10px] text-gray-500 uppercase block">Special Attack</span>
                <span className="text-xs font-bold text-yellow-500">{p1Char.specialName}</span>
                <p className="text-[10px] text-gray-400 mt-0.5 italic leading-tight">{p1Char.specialDescription}</p>
              </div>

              <div className="pt-2 border-t border-purple-950/60 space-y-1.5">
                <span className="text-[10px] text-gray-500 uppercase block mb-1">Combat Attributes (With Modifiers)</span>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                  {(() => {
                    const activeWeapon = p1Char.weapons[p1WeaponIdx] || p1Char.weapons[0];
                    return (
                      <>
                        <div>
                          <span className="text-[8px] text-gray-500 uppercase block">SPEED</span>
                          {renderStatBar(Math.max(1, Math.min(5, p1Char.stats.speed + activeWeapon.bonusSpeed)), p1Char.color)}
                        </div>
                        <div>
                          <span className="text-[8px] text-gray-500 uppercase block">POWER</span>
                          {renderStatBar(Math.max(1, Math.min(5, p1Char.stats.power + activeWeapon.bonusPower)), p1Char.color)}
                        </div>
                        <div>
                          <span className="text-[8px] text-gray-500 uppercase block">DEFENSE</span>
                          {renderStatBar(Math.max(1, Math.min(5, p1Char.stats.defense + activeWeapon.bonusDefense)), p1Char.color)}
                        </div>
                        <div>
                          <span className="text-[8px] text-gray-500 uppercase block">RANGE</span>
                          {renderStatBar(Math.max(1, Math.min(5, p1Char.stats.range + activeWeapon.bonusRange)), p1Char.color)}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Characters Grid Selector Panel */}
        <div className="md:col-span-4 bg-[#0a0515]/90 border border-purple-950 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-center text-xs font-bold uppercase tracking-[0.2em] mb-4 text-purple-400">
              Fighter Gallery
            </h3>
            
            <div className="grid grid-cols-2 gap-2 mb-4">
              {CHARACTERS.map((char, idx) => {
                const isSelectedP1 = p1Index === idx;
                const isSelectedP2 = p2Index === idx;
                return (
                  <div
                    key={char.id}
                    className={`relative p-3 rounded-lg cursor-pointer transition-all duration-200 border-2 flex flex-col justify-between bg-[#110923] hover:bg-[#1b1035] ${
                      isSelectedP1 && isSelectedP2
                        ? 'border-dashed border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                        : isSelectedP1
                        ? 'border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                        : isSelectedP2
                        ? 'border-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]'
                        : 'border-purple-950 hover:border-purple-800'
                    }`}
                    onClick={() => {
                      if (mode === 'PvP') {
                        // Alternate select toggles or let them tap P1 then P2
                        // Let's implement left tap for P1, right tap for P2 or standard cycle
                        // Easy helper: P2 selection cycles if clicked, P1 stays unless clicked explicitly, or simple selector button
                      }
                      handleP1Select(idx);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-black tracking-normal text-sm capitalize">{char.name}</span>
                      <div className="flex gap-1">
                        {isSelectedP1 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse text-[8px] flex items-center justify-center font-bold" />
                        )}
                        {isSelectedP2 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse text-[8px] flex items-center justify-center font-bold" />
                        )}
                      </div>
                    </div>
                    
                    <span className="text-[8px] text-gray-500 mt-1 uppercase truncate block">{char.title}</span>
                    
                    <div className="flex gap-1.5 mt-2">
                      <div className="h-1.5 flex-1 rounded bg-[#1e1b29]" style={{ width: `${char.stats.power * 20}%`, backgroundColor: isSelectedP1 ? '#00ccff77' : isSelectedP2 ? '#ff552277' : '#ffff0033' }} />
                    </div>

                    {/* Simple overlay prompts on selection to clarify control */}
                    {mode === 'PvP' && (
                      <div className="mt-2 pt-1 border-t border-purple-950/40 flex justify-between text-[8px] text-gray-400">
                        <button
                          className="px-1.5 py-0.5 bg-cyan-950/40 hover:bg-cyan-950 rounded text-cyan-300 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleP1Select(idx);
                          }}
                        >
                          Select 1P
                        </button>
                        <button
                          className="px-1.5 py-0.5 bg-orange-950/40 hover:bg-orange-950 rounded text-orange-300 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleP2Select(idx);
                          }}
                        >
                          Select 2P
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Helper Tip */}
            <div className="p-3 bg-purple-950/25 border border-purple-900/30 rounded-lg text-[10px] text-gray-400 leading-relaxed">
              <span className="font-bold text-purple-400 block mb-1">🎮 FIGHT NOTE</span>
              {mode === 'PvE' && "You will face the computer AI. Use Movement and Block mechanics with A & D keys to minimize hitstun. Hold backward to block attacks."}
              {mode === 'PvP' && "Versus Duel allows local players on the same keyboard. Choose laptop friendly bindings below to avoid clustered fingers."}
              {mode === 'Training' && "Training mode is the perfect sandbox. Infinite resource supplies to perfect your chain inputs, cancels, and specials."}
            </div>
          </div>

          <div className="pt-4 border-t border-purple-950/60 flex items-center justify-between">
            <button
              onClick={() => { sfx.playChime(); setShowConfig(!showConfig); }}
              className="px-3 py-2 bg-purple-950/40 border border-purple-800/60 rounded text-[10px] tracking-wider uppercase flex items-center gap-1.5 text-purple-300 hover:bg-purple-950"
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
            <span className="text-[9px] text-[#554a6d]">V1.2 COMPATIBLE</span>
          </div>
        </div>

        {/* P2 / Enemy AI Selector Card */}
        <div className="md:col-span-4 bg-[#0a0515]/90 border border-purple-950 rounded-xl p-4 flex flex-col justify-between" style={{ borderColor: `${p2Char.color}44` }}>
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-purple-950/60 mb-3">
              <span className="text-[10px] uppercase font-bold text-orange-500 tracking-wider">
                {mode === 'PvE' ? 'OPPONENT AI' : 'PLAYER 2'}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-orange-950/30 border border-orange-850/30 text-orange-400 rounded">
                READY
              </span>
            </div>

            {/* Visual Portrait */}
            <div className="aspect-[4/3] rounded-lg relative overflow-hidden flex items-center justify-center mb-3 border border-purple-950 bg-gradient-to-b from-[#1c0e2a] to-[#040108]">
              <div className="absolute inset-0 opacity-10" style={{ background: p2Char.color }} />
              
              {/* Dynamic Retro Silhouette Figure */}
              <div 
                className="w-14 h-24 rounded-md relative flex flex-col items-center justify-center transition-all duration-300 transform"
                style={{
                  backgroundColor: p2Char.color,
                  boxShadow: `0 0 20px ${p2Char.color}`,
                }}
              >
                {/* Eyes in preview */}
                <div className="absolute top-2 flex justify-between w-6">
                  <div className="w-1 h-1 bg-white" />
                  <div className="w-1 h-1 bg-white" />
                </div>
                {/* Visual energy lines */}
                <div className="w-10 h-0.5 bg-[#ffffff55] absolute top-10" />
                <div className="w-8 h-1 bg-[#ffffff44] absolute bottom-4 animate-bounce" />
              </div>

              <div className="absolute bottom-2 left-2 text-left">
                <h4 className="text-xl font-bold tracking-tight uppercase" style={{ color: p2Char.color }}>{p2Char.name}</h4>
                <p className="text-[9px] text-gray-500">{p2Char.title}</p>
              </div>
            </div>

            {/* Character Info Box */}
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-orange-400 font-bold uppercase block mb-1.5">🗡️ SELECT WEAPON LOADOUT</span>
                <div className="space-y-1.5">
                  {p2Char.weapons.map((w, wIdx) => {
                    const isSelected = p2WeaponIdx === wIdx;
                    return (
                      <button
                        key={w.id}
                        disabled={mode === 'PvE' && false /* allow changing AI weapon or make it selectable too! */}
                        onClick={() => { setP2WeaponIdx(wIdx); sfx.playChime(); }}
                        className={`w-full p-2 rounded-lg text-left transition-all border leading-tight ${
                          isSelected
                            ? 'bg-orange-950/20 border-orange-500 text-white shadow-[0_0_8px_rgba(249,115,22,0.25)] font-semibold'
                            : 'bg-[#0a0515]/30 border-purple-950 text-gray-400 hover:border-purple-900 hover:text-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[11px]">
                          <span style={{ color: isSelected ? p2Char.color : undefined }}>{w.name}</span>
                          <span className="text-[8px] text-gray-500 uppercase px-1 py-0.2 bg-purple-950/40 rounded">{w.type}</span>
                        </div>
                        <p className="text-[9px] text-gray-500 mt-0.5 leading-tight">{w.description}</p>
                        <div className="flex gap-2 text-[8px] font-mono mt-1 text-gray-400">
                          {w.bonusPower !== 0 && (
                            <span className={w.bonusPower > 0 ? 'text-green-400' : 'text-red-400'}>
                              PWR {w.bonusPower > 0 ? `+${w.bonusPower}` : w.bonusPower}
                            </span>
                          )}
                          {w.bonusSpeed !== 0 && (
                            <span className={w.bonusSpeed > 0 ? 'text-green-400' : 'text-red-400'}>
                              SPD {w.bonusSpeed > 0 ? `+${w.bonusSpeed}` : w.bonusSpeed}
                            </span>
                          )}
                          {w.bonusDefense !== 0 && (
                            <span className={w.bonusDefense > 0 ? 'text-green-400' : 'text-red-400'}>
                              DEF {w.bonusDefense > 0 ? `+${w.bonusDefense}` : w.bonusDefense}
                            </span>
                          )}
                          {w.bonusRange !== 0 && (
                            <span className={w.bonusRange > 0 ? 'text-green-400' : 'text-red-400'}>
                              RNG {w.bonusRange > 0 ? `+${w.bonusRange}` : w.bonusRange}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="pt-1.5 border-t border-purple-950/45">
                <span className="text-[10px] text-gray-500 uppercase block">Special Attack</span>
                <span className="text-xs font-bold text-yellow-500">{p2Char.specialName}</span>
                <p className="text-[10px] text-gray-400 mt-0.5 italic leading-tight">{p2Char.specialDescription}</p>
              </div>

              <div className="pt-2 border-t border-purple-950/60 space-y-1.5">
                <span className="text-[10px] text-gray-500 uppercase block mb-1">Combat Attributes (With Modifiers)</span>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                  {(() => {
                    const activeWeapon = p2Char.weapons[p2WeaponIdx] || p2Char.weapons[0];
                    return (
                      <>
                        <div>
                          <span className="text-[8px] text-gray-500 uppercase block">SPEED</span>
                          {renderStatBar(Math.max(1, Math.min(5, p2Char.stats.speed + activeWeapon.bonusSpeed)), p2Char.color)}
                        </div>
                        <div>
                          <span className="text-[8px] text-gray-500 uppercase block">POWER</span>
                          {renderStatBar(Math.max(1, Math.min(5, p2Char.stats.power + activeWeapon.bonusPower)), p2Char.color)}
                        </div>
                        <div>
                          <span className="text-[8px] text-gray-500 uppercase block">DEFENSE</span>
                          {renderStatBar(Math.max(1, Math.min(5, p2Char.stats.defense + activeWeapon.bonusDefense)), p2Char.color)}
                        </div>
                        <div>
                          <span className="text-[8px] text-gray-500 uppercase block">RANGE</span>
                          {renderStatBar(Math.max(1, Math.min(5, p2Char.stats.range + activeWeapon.bonusRange)), p2Char.color)}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Config Settings Expanded Modal Block */}
      {showConfig && (
        <div className="mt-4 p-4 rounded-xl bg-[#080312] border border-purple-900/60 relative z-20 transition-all duration-300">
          <h3 className="text-xs font-bold tracking-wider text-purple-400 uppercase mb-3 flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" /> Match Customization Setup
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mode === 'PvE' && (
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 uppercase font-semibold">AI Aggressiveness / Skill</span>
                <div className="flex gap-1">
                  {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((dif) => (
                    <button
                      key={dif}
                      onClick={() => { setDifficulty(dif); sfx.playChime(); }}
                      className={`flex-1 py-1 px-3 border rounded text-xs transition-all ${
                        difficulty === dif
                          ? 'border-yellow-500 bg-yellow-950/20 text-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.2)]'
                          : 'border-purple-950/60 text-gray-400 hover:border-purple-800'
                      }`}
                    >
                      {dif}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-semibold">Player 2 Keys Laydown</span>
              <div className="flex gap-1">
                <button
                  onClick={() => { setUseLaptopControls(true); sfx.playChime(); }}
                  className={`flex-1 py-1 px-2 border rounded text-xs transition-all flex items-center justify-center gap-1 ${
                    useLaptopControls
                      ? 'border-cyan-400 bg-cyan-950/20 text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.2)]'
                      : 'border-purple-950/60 text-gray-400 hover:border-purple-800'
                  }`}
                >
                  <Laptop className="w-3 h-3" /> Laptop (Slash/Period/Comma)
                </button>
                <button
                  onClick={() => { setUseLaptopControls(false); sfx.playChime(); }}
                  className={`flex-1 py-1 px-2 border rounded text-xs transition-all flex items-center justify-center gap-1 ${
                    !useLaptopControls
                      ? 'border-cyan-400 bg-cyan-950/20 text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.2)]'
                      : 'border-purple-950/60 text-gray-400 hover:border-purple-800'
                  }`}
                >
                  <Keyboard className="w-3 h-3" /> Numpad (1, 2, 3 keys)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Play Action Trigger Button */}
      <div className="mt-6 text-center relative z-10 p-[1px] bg-gradient-to-r from-cyan-400 via-purple-500 to-orange-400 rounded-lg">
        <button
          onClick={handleStartGame}
          className="w-full py-4 text-sm md:text-base bg-[#07010f] hover:bg-transparent rounded-lg font-black tracking-[0.3em] uppercase text-white hover:text-[#07010f] transition-all duration-300 relative overflow-hidden group flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5 fill-current" />
          START DUEL
        </button>
      </div>

      {/* Control Reference Quick-board */}
      <div className="mt-6 border-t border-purple-950/40 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] text-gray-500">
        <div className="bg-[#050209] p-3 rounded-lg border border-purple-950/60">
          <span className="font-bold text-cyan-400 block mb-1">PLAYER 1 CONTROLS:</span>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            <span>Move Left/Right:</span> <kbd className="text-cyan-300 bg-cyan-950/20 px-1 py-0.5 rounded border border-cyan-900/30">A</kbd> / <kbd className="text-cyan-300 bg-cyan-950/20 px-1 py-0.5 rounded border border-cyan-900/30">D</kbd>
            <span>Jump Up:</span> <kbd className="text-cyan-300 bg-cyan-950/20 px-1 py-0.5 rounded border border-cyan-900/30">W</kbd>
            <span>Crouch / Duck:</span> <kbd className="text-cyan-300 bg-cyan-950/20 px-1 py-0.5 rounded border border-cyan-900/30">S</kbd>
            <span>Standard Punch:</span> <kbd className="text-cyan-300 bg-cyan-950/20 px-1 py-0.5 rounded border border-cyan-900/30">F</kbd>
            <span>High Kick:</span> <kbd className="text-cyan-300 bg-cyan-950/20 px-1 py-0.5 rounded border border-cyan-900/30">G</kbd>
            <span>Ultimate Secret:</span> <kbd className="text-cyan-300 bg-cyan-950/20 px-1 py-0.5 rounded border border-cyan-900/30">H</kbd> <span className="text-[8px] text-yellow-400 font-bold">(Requires Full Meter)</span>
          </div>
        </div>

        <div className="bg-[#050209] p-3 rounded-lg border border-purple-950/60">
          <span className="font-bold text-orange-400 block mb-1">PLAYER 2 CONTROLS:</span>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            <span>Move Left/Right:</span> <kbd className="text-orange-300 bg-orange-950/20 px-1 py-0.5 rounded border border-orange-900/30">←</kbd> / <kbd className="text-orange-300 bg-orange-950/20 px-1 py-0.5 rounded border border-orange-900/30">→</kbd>
            <span>Jump Up:</span> <kbd className="text-orange-300 bg-orange-950/20 px-1 py-0.5 rounded border border-orange-900/30">↑</kbd>
            <span>Crouch / Duck:</span> <kbd className="text-orange-300 bg-orange-950/20 px-1 py-0.5 rounded border border-orange-900/30">↓</kbd>
            {useLaptopControls ? (
              <>
                <span>Standard Punch:</span> <kbd className="text-orange-300 bg-orange-950/20 px-1 py-0.5 rounded border border-orange-900/30">/</kbd>
                <span>High Kick:</span> <kbd className="text-orange-300 bg-orange-950/20 px-1 py-0.5 rounded border border-orange-900/30">.</kbd>
                <span>Ultimate Secret:</span> <kbd className="text-orange-300 bg-orange-950/20 px-1 py-0.5 rounded border border-orange-900/30">,</kbd> <span className="text-[8px] text-yellow-400 font-bold">(Requires Full Meter)</span>
              </>
            ) : (
              <>
                <span>Standard Punch:</span> <kbd className="text-orange-300 bg-orange-950/20 px-1 py-0.5 rounded border border-orange-900/30">Num 1</kbd>
                <span>High Kick:</span> <kbd className="text-orange-300 bg-orange-950/20 px-1 py-0.5 rounded border border-orange-900/30">Num 2</kbd>
                <span>Ultimate Secret:</span> <kbd className="text-orange-300 bg-orange-950/20 px-1 py-0.5 rounded border border-orange-900/30">Num 3</kbd> <span className="text-[8px] text-yellow-400 font-bold">(Requires Full Meter)</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
