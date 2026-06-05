/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameMode = 'PvE' | 'PvP' | 'Training';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type FighterState = 'idle' | 'walk' | 'crouch' | 'prejump' | 'jump' | 'hit' | 'block' | 'ko';

export type AttackType = 'punch' | 'kick' | 'special';

export interface Weapon {
  id: string;
  name: string;
  type: 'light' | 'medium' | 'heavy' | 'plasma';
  description: string;
  bonusPower: number;   // -1 to +2 to base stats
  bonusSpeed: number;   // -1 to +2 to base stats
  bonusDefense: number; // -1 to +2 to base stats
  bonusRange: number;   // -1 to +2 to base stats
  glowColor: string;
  visualScale: number;  // sizes
  spriteType: 'saber' | 'claymore' | 'claws' | 'twin_daggers' | 'mace' | 'halberd';
}

export interface Character {
  id: string;
  name: string;
  title: string;
  color: string;
  darkColor: string;
  weaponName: string;
  specialName: string;
  specialDescription: string;
  stats: {
    speed: number;   // 1 to 5
    power: number;   // 1 to 5
    defense: number; // 1 to 5
    range: number;   // 1 to 5
  };
  weapons: Weapon[]; // Rich list of selectable weapons
}

export interface Stage {
  id: string;
  name: string;
  tagline: string;
  skyTop: string;
  skyBottom: string;
  groundTop: string;
  groundBottom: string;
  neonLine: string;
  gridLine: string;
  ambientParticleColor: string;
  particleType: 'blossom' | 'rain' | 'spark';
}

export interface ControlKeys {
  left: string;
  right: string;
  up: string;   // Jump / Up
  down: string; // Crouch / Block alternate down
  punch: string;
  kick: string;
  special: string;
}

export interface Fighter {
  id: 'p1' | 'p2';
  character: Character;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  special: number;
  maxSpecial: number;
  dir: number; // 1 = facing right, -1 = facing left
  onGround: boolean;
  state: FighterState;
  stateTimer: number;
  
  // Custom actions
  crouching: boolean;
  isBlocking: boolean;
  dashing: boolean;
  dashCooldown: number;
  
  // Attack states
  attacking: boolean;
  attackType: AttackType | null;
  attackTimer: number;
  attackHit: boolean;
  
  // Stun states
  hitStun: number;
  blockStun: number;
  
  // Combo mechanics
  comboCount: number;
  comboTimer: number;
  
  // Wins count in current match
  wins: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number; // from 1.0 down to 0.0
  size: number;
}

export interface HitEffect {
  id: number;
  x: number;
  y: number;
  life: number;
  color: string;
  type: AttackType;
}

export interface Projectile {
  id: number;
  ownerId: 'p1' | 'p2';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  color: string;
}
