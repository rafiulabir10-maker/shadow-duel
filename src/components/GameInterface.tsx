/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Character, Fighter, GameMode, Difficulty, ControlKeys, Particle, HitEffect, Projectile, FighterState, AttackType, Stage, Weapon } from '../types';
import { sfx } from '../utils/audio';
import { ArrowLeft, RefreshCw, Volume2, VolumeX, Shield, Zap, Flame, Award, HelpCircle } from 'lucide-react';

interface GameInterfaceProps {
  p1Char: Character;
  p2Char: Character;
  p1Weapon: Weapon;
  p2Weapon: Weapon;
  mode: GameMode;
  difficulty: Difficulty;
  p2Keys: ControlKeys;
  stage: Stage;
  onExit: () => void;
}

export const GameInterface: React.FC<GameInterfaceProps> = ({
  p1Char,
  p2Char,
  p1Weapon,
  p2Weapon,
  mode,
  difficulty,
  p2Keys,
  stage,
  onExit,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Helper getters to evaluate stats factored with selected weapon loadout modifiers
  const getFighterPower = (f: Fighter) => {
    const base = f.character.stats.power;
    const bonus = f.id === 'p1' ? p1Weapon.bonusPower : p2Weapon.bonusPower;
    return Math.max(1, Math.min(6, base + bonus));
  };
  const getFighterSpeed = (f: Fighter) => {
    const base = f.character.stats.speed;
    const bonus = f.id === 'p1' ? p1Weapon.bonusSpeed : p2Weapon.bonusSpeed;
    return Math.max(1, Math.min(6, base + bonus));
  };
  const getFighterDefense = (f: Fighter) => {
    const base = f.character.stats.defense;
    const bonus = f.id === 'p1' ? p1Weapon.bonusDefense : p2Weapon.bonusDefense;
    return Math.max(1, Math.min(6, base + bonus));
  };
  const getFighterRange = (f: Fighter) => {
    const base = f.character.stats.range;
    const bonus = f.id === 'p1' ? p1Weapon.bonusRange : p2Weapon.bonusRange;
    return Math.max(1, Math.min(6, base + bonus));
  };
  
  // Game states syncing to UI
  const [p1Hp, setP1Hp] = useState(100);
  const [p2Hp, setP2Hp] = useState(100);
  const [p1Special, setP1Special] = useState(0);
  const [p2Special, setP2Special] = useState(0);
  const [p1Combo, setP1Combo] = useState(0);
  const [p2Combo, setP2Combo] = useState(0);
  
  const [p1Wins, setP1Wins] = useState(0);
  const [p2Wins, setP2Wins] = useState(0);
  
  const [timer, setTimer] = useState(99);
  const [round, setRound] = useState(1);
  const [matchOver, setMatchOver] = useState(false);
  const [winnerText, setWinnerText] = useState('');
  const [roundWinner, setRoundWinner] = useState<'p1' | 'p2' | 'draw' | null>(null);
  
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showControlsGuide, setShowControlsGuide] = useState(false);

  // AI-Powered full-stack enhancements states
  const [commentary, setCommentary] = useState("ROUND 1! PREPARE YOUR WEAPONS... TIME TO DUEL!");
  const [coachMarkdown, setCoachMarkdown] = useState("");
  const [isLoadingCoach, setIsLoadingCoach] = useState(false);
  const [showCoachPanel, setShowCoachPanel] = useState(true);

  // Asynchronous fetcher for live hype announcer reactions
  const fetchLiveCommentary = async (eventType: string) => {
    try {
      const res = await fetch('/api/commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p1Name: p1Char.name,
          p1Weapon: p1Weapon.name,
          p2Name: p2Char.name,
          p2Weapon: p2Weapon.name,
          eventType,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          setCommentary(data.text);
        }
      }
    } catch (e) {
      console.error("Failed fetching live commentary.", e);
    }
  };

  // Asynchronous tactic analysis generator from Dojo Master Coach 
  const fetchCoachAdvice = async () => {
    setIsLoadingCoach(true);
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p1: p1Char,
          p1Weapon: p1Weapon,
          p2: p2Char,
          p2Weapon: p2Weapon,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.markdown) {
          setCoachMarkdown(data.markdown);
        }
      }
    } catch (e) {
      console.error("Failed fetching tactical coach advice.", e);
    } finally {
      setIsLoadingCoach(false);
    }
  };
  
  // High performance game loop refs
  const requestRef = useRef<number | null>(null);
  const keysPressed = useRef<Record<string, boolean>>({});
  const lastTimeRef = useRef<number>(0);
  
  // Canvas logical dimensions
  const CW = 800;
  const CH = 450;
  const GROUND_Y = 360;
  const GRAVITY = 0.65;
  
  // Particle systems & Match entities
  const particles = useRef<Particle[]>([]);
  const hitEffects = useRef<HitEffect[]>([]);
  const projectiles = useRef<Projectile[]>([]);
  const screenShake = useRef<number>(0);
  const scaleRef = useRef<number>(1);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nextParticleId = useRef<number>(0);
  const nextEffectId = useRef<number>(0);
  const nextProjId = useRef<number>(0);

  // Custom visual assets generated by code
  // Fire pillar markers for Rex's special move
  const groundFirePillars = useRef<Array<{ x: number; timer: number; warning: boolean }>>([]);

  // Setup Fighter Objects
  const f1Ref = useRef<Fighter>({
    id: 'p1',
    character: p1Char,
    x: 180,
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    w: 50,
    h: 84,
    hp: 100,
    maxHp: 100,
    special: 20, // Start with a little buffer
    maxSpecial: 100,
    dir: 1,
    onGround: true,
    state: 'idle',
    stateTimer: 0,
    crouching: false,
    isBlocking: false,
    dashing: false,
    dashCooldown: 0,
    attacking: false,
    attackType: null,
    attackTimer: 0,
    attackHit: false,
    hitStun: 0,
    blockStun: 0,
    comboCount: 0,
    comboTimer: 0,
    wins: 0,
  });

  const f2Ref = useRef<Fighter>({
    id: 'p2',
    character: p2Char,
    x: 570,
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    w: 50,
    h: 84,
    hp: 100,
    maxHp: 100,
    special: 20,
    maxSpecial: 100,
    dir: -1,
    onGround: true,
    state: 'idle',
    stateTimer: 0,
    crouching: false,
    isBlocking: false,
    dashing: false,
    dashCooldown: 0,
    attacking: false,
    attackType: null,
    attackTimer: 0,
    attackHit: false,
    hitStun: 0,
    blockStun: 0,
    comboCount: 0,
    comboTimer: 0,
    wins: 0,
  });

  const activeKeysConfig1 = {
    left: 'KeyA',
    right: 'KeyD',
    up: 'KeyW',
    down: 'KeyS',
    punch: 'KeyF',
    kick: 'KeyG',
    special: 'KeyH',
  };

  const activeKeysConfig2 = p2Keys;

  // Particle Spawner
  const spawnBlastParticles = (x: number, y: number, color: string, count = 12, speedMul = 1) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (2 + Math.random() * 5) * speedMul;
      particles.current.push({
        id: nextParticleId.current++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        color,
        life: 1.0,
        size: 2.5 + Math.random() * 4,
      });
    }
  };

  // Sound triggering safely
  const handleAttackTrigger = (f: Fighter, type: AttackType) => {
    if (type === 'punch') {
      sfx.playPunch();
    } else if (type === 'kick') {
      sfx.playKick();
    } else if (type === 'special') {
      sfx.playSpecialCharge();
      setTimeout(() => sfx.playSpecialFire(), 120);
    }
  };

  // Start actual physical attacks
  const initiateAttack = (fRef: React.MutableRefObject<Fighter>, type: AttackType) => {
    const f = fRef.current;
    if (f.attacking || f.hitStun > 0 || f.blockStun > 0 || f.state === 'ko') return;
    
    // Check energy constraint for ultimate
    if (type === 'special' && f.special < 100) return;

    f.attacking = true;
    f.attackType = type;
    f.attackHit = false;
    
    // Timing profiles (Frames)
    if (type === 'special') {
      f.special = 0;
      f.attackTimer = 44;
      fetchLiveCommentary(`Unleashes Ultimate Special: ${f.character.specialName.toUpperCase()}!`);
      
      // Perform character-specific specials triggering immediately or delayed
      if (f.character.id === 'luna') {
        // Fire horizontal void missile
        projectiles.current.push({
          id: nextProjId.current++,
          ownerId: f.id,
          x: f.dir > 0 ? f.x + f.w + 10 : f.x - 20,
          y: f.y - f.h * 0.65,
          vx: f.dir * 8.5,
          vy: 0,
          radius: 12,
          damage: 22,
          color: f.character.color,
        });
      } else if (f.character.id === 'rex') {
        // Queue thermal ground eruption hazards relative to the opponent's current location!
        const opponent = f.id === 'p1' ? f2Ref.current : f1Ref.current;
        groundFirePillars.current.push(
          { x: opponent.x - 60, timer: 30, warning: true },
          { x: opponent.x, timer: 38, warning: true },
          { x: opponent.x + 60, timer: 46, warning: true }
        );
      }
    } else if (type === 'kick') {
      f.attackTimer = 24;
    } else {
      f.attackTimer = 16;
    }

    handleAttackTrigger(f, type);
  };

  // Keyboard and button handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (paused || matchOver) return;
      const code = e.code;
      keysPressed.current[code] = true;

      // Prevent window scrolling on arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.key)) {
        e.preventDefault();
      }

      // Check attacks for Player 1
      if (code === activeKeysConfig1.punch) initiateAttack(f1Ref, 'punch');
      else if (code === activeKeysConfig1.kick) initiateAttack(f1Ref, 'kick');
      else if (code === activeKeysConfig1.special) initiateAttack(f1Ref, 'special');

      // Check attacks for Player 2
      if (mode === 'PvP') {
        if (code === activeKeysConfig2.punch) initiateAttack(f2Ref, 'punch');
        else if (code === activeKeysConfig2.kick) initiateAttack(f2Ref, 'kick');
        else if (code === activeKeysConfig2.special) initiateAttack(f2Ref, 'special');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [paused, matchOver, mode, p2Keys]);

  // Handle ResizeObserver to maintain aspect ratio on any screen size gracefully
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;
    
    const scaleCanvas = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight || 450;
      
      // Calculate best fitting scaling parameter for 800x450 ratio
      const ratio = 800 / 450;
      let w = containerWidth;
      let h = containerWidth / ratio;
      
      if (h > containerHeight) {
        h = containerHeight;
        w = containerHeight * ratio;
      }
      
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      scaleRef.current = w / 800;
    };

    const observer = new ResizeObserver(() => scaleCanvas());
    observer.observe(containerRef.current);
    scaleCanvas();

    return () => {
      observer.disconnect();
    };
  }, []);

  // Timer Interval
  useEffect(() => {
    if (paused || matchOver) return;

    timerIntervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current!);
          evaluateRoundWinner();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [paused, matchOver, round]);

  const evaluateRoundWinner = () => {
    const f1 = f1Ref.current;
    const f2 = f2Ref.current;
    let roundWinnerId: 'p1' | 'p2' | 'draw' = 'draw';

    if (f1.hp <= 0 && f2.hp <= 0) {
      roundWinnerId = 'draw';
    } else if (f1.hp <= 0) {
      roundWinnerId = 'p2';
      f2.wins++;
      setP2Wins(f2.wins);
    } else if (f2.hp <= 0) {
      roundWinnerId = 'p1';
      f1.wins++;
      setP1Wins(f1.wins);
    } else {
      // Time-out check
      if (f1.hp > f2.hp) {
        roundWinnerId = 'p1';
        f1.wins++;
        setP1Wins(f1.wins);
      } else if (f2.hp > f1.hp) {
        roundWinnerId = 'p2';
        f2.wins++;
        setP2Wins(f2.wins);
      } else {
        roundWinnerId = 'draw';
      }
    }

    setRoundWinner(roundWinnerId);
    const winExclamation = roundWinnerId === 'draw'
      ? 'Draw Round!'
      : `${roundWinnerId === 'p1' ? f1.character.name : f2.character.name} Wins Round!`;
    setWinnerText(winExclamation);
    sfx.playKo();

    // Check if Match is completely overall (best of 3 wins, i.e. 2 wins)
    if (f1.wins >= 2 || f2.wins >= 2) {
      const champName = f1.wins >= 2 ? p1Char.name : p2Char.name;
      fetchLiveCommentary(`Match complete! Champion crowned: ${champName}. Absolute dominance.`);
      setTimeout(() => {
        setMatchOver(true);
        setWinnerText(
          f1.wins >= 2
            ? `🏆 ${p1Char.name} is the CHAMPION!`
            : `🏆 ${p2Char.name} is the CHAMPION!`
        );
      }, 1500);
    } else {
      fetchLiveCommentary(`Round complete! ${winExclamation} Prepare for the next battle!`);
      // Setup next round automatic load
      setTimeout(() => {
        loadNewRound();
      }, 2500);
    }
  };

  const loadNewRound = () => {
    // Reset fighter positions and status parameters
    const f1 = f1Ref.current;
    const f2 = f2Ref.current;
    
    f1.x = 180;
    f1.y = GROUND_Y;
    f1.vx = 0;
    f1.vy = 0;
    f1.hp = 100;
    f1.special = Math.min(100, f1.special + 30); // Bonus rollover energy
    f1.dir = 1;
    f1.onGround = true;
    f1.state = 'idle';
    f1.attacking = false;
    f1.hitStun = 0;
    f1.blockStun = 0;
    f1.comboCount = 0;
    f1.crouching = false;
    f1.isBlocking = false;

    f2.x = 570;
    f2.y = GROUND_Y;
    f2.vx = 0;
    f2.vy = 0;
    f2.hp = 100;
    f2.special = Math.min(100, f2.special + 30);
    f2.dir = -1;
    f2.onGround = true;
    f2.state = 'idle';
    f2.attacking = false;
    f2.hitStun = 0;
    f2.blockStun = 0;
    f2.comboCount = 0;
    f2.crouching = false;
    f2.isBlocking = false;

    projectiles.current = [];
    particles.current = [];
    groundFirePillars.current = [];
    
    setP1Hp(100);
    setP2Hp(100);
    setP1Special(f1.special);
    setP2Special(f2.special);
    setP1Combo(0);
    setP2Combo(0);
    setTimer(99);
    setRoundWinner(null);
    setWinnerText('');
    setRound((r) => r + 1);
  };

  const resetWholeMatch = () => {
    f1Ref.current.wins = 0;
    f2Ref.current.wins = 0;
    setP1Wins(0);
    setP2Wins(0);
    setRound(0); // Trigger round advancement back to 1
    setMatchOver(false);
    setWinnerText('');
    setRoundWinner(null);
    
    // Simulate natural first load setup
    setTimeout(() => {
      loadNewRound();
      setRound(1);
    }, 10);
  };

  // Direct Overlapping rect collision
  const rectsOverlap = (r1: { x: number; y: number; w: number; h: number }, r2: { x: number; y: number; w: number; h: number }) => {
    return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
  };

  // Calculate customized Attack Bounding Box based on character specs
  const calculateAttackHitbox = (f: Fighter) => {
    const isKick = f.attackType === 'kick';
    const isSpecial = f.attackType === 'special';
    
    // Characters have range multipliers (+ weapon loadout adjustments)
    const rangeMultiplier = 0.8 + (getFighterRange(f) * 0.15); // ranges from 0.95 to 1.55
    let reach = (isSpecial ? 110 : (isKick ? 80 : 60)) * rangeMultiplier;
    let height = isKick ? 22 : 28;
    
    // Sola's Golden Shield ultimate expands all around!
    if (isSpecial && f.character.id === 'sola') {
      return {
        x: f.x - 70,
        y: f.y - f.h - 10,
        w: f.w + 140,
        h: f.h + 20,
      };
    }

    // Default direction-based reach punch/kick
    return {
      x: f.dir > 0 ? f.x + f.w : f.x - reach,
      y: f.crouching 
        ? (f.y - f.h * 0.4) 
        : (f.y - f.h * (isKick ? 0.55 : 0.78)),
      w: reach,
      h: height,
    };
  };

  // Computer Opponent AI Decision Tree (PvE)
  const processOpponentAI = (ai: Fighter, enemy: Fighter, tickRate: number) => {
    if (ai.hitStun > 0 || ai.blockStun > 0 || ai.state === 'ko' || matchOver || paused) return;

    const dx = enemy.x - ai.x;
    const distance = Math.abs(dx);
    ai.dir = dx > 0 ? 1 : -1;

    // AI parameters based on Difficulty
    let reactChance = 0.03;   // Lower = laggy AI
    let attackChance = 0.02;  // Punch rate
    let blockRate = 0.20;     // Chance AI holds backward on player attack
    let jumpOverRatio = 0.15; // Chance to dodge projectiles

    if (difficulty === 'Medium') {
      reactChance = 0.08;
      attackChance = 0.05;
      blockRate = 0.45;
      jumpOverRatio = 0.50;
    } else if (difficulty === 'Hard') {
      reactChance = 0.18;
      attackChance = 0.09;
      blockRate = 0.80;
      jumpOverRatio = 0.90;
    }

    // Smart special burst counter
    if (ai.special >= 100 && distance < 200 && Math.random() < 0.3) {
      initiateAttack(f2Ref, 'special');
      return;
    }

    // Check if enemy is currently attacking AI - attempt to block back!
    if (enemy.attacking && distance < 180) {
      if (Math.random() < blockRate) {
        // Force Backwards movement to stand blocking
        ai.vx = ai.dir * -2.2;
        ai.isBlocking = true;
        return;
      }
    }

    // Look for approaching projectiles and attempt defensive jump!
    const activeProjectiles = projectiles.current.filter(p => p.ownerId !== ai.id);
    if (activeProjectiles.length > 0 && ai.onGround) {
      const nearestProj = activeProjectiles[0];
      const projDist = Math.abs(nearestProj.x - ai.x);
      if (projDist < 160 && Math.random() < jumpOverRatio) {
        ai.vy = -13.5;
        ai.onGround = false;
        ai.state = 'jump';
        sfx.playJump();
        return;
      }
    }

    // Core combat spacing decision
    if (Math.random() < reactChance) {
      const preferredRange = 70 + (getFighterRange(ai) * 15);
      
      if (distance > preferredRange + 50) {
        // Advance Closer
        ai.vx = ai.dir * (2.4 + getFighterSpeed(ai) * 0.4);
      } else if (distance < preferredRange - 30) {
        // Backoff slightly
        ai.vx = ai.dir * -2.0;
        // Moderate chance to crouch dodge alternate
        if (Math.random() < 0.25) {
          ai.crouching = true;
          ai.vx = 0;
        } else {
          ai.crouching = false;
        }
      } else {
        // Perfect striking distance - launch randomized punches and kicks
        ai.vx = 0;
        ai.crouching = Math.random() < 0.2; // Blend crouches
        
        if (Math.random() < attackChance) {
          const randAtk = Math.random() > 0.45 ? 'kick' : 'punch';
          initiateAttack(f2Ref, randAtk as AttackType);
        }
      }
    }
  };

  // Core Physics Engine loops (60 FPS run loop)
  const gameStep = (timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const elapsed = timestamp - lastTimeRef.current;
    
    if (!paused && !matchOver) {
      updateGamePhysics();
    }
    
    renderGameCanvas();
    
    lastTimeRef.current = timestamp;
    requestRef.current = requestAnimationFrame(gameStep);
  };

  // Start the physical frame update loops once fully populated
  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameStep);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [paused, matchOver, mode, difficulty]);

  // AI Coach tactical briefing trigger and initial announcer exclamations
  useEffect(() => {
    fetchCoachAdvice();
    fetchLiveCommentary("Match started! Prepare for an ultimate battle!");
  }, []);

  // Game physical parameter checks
  const updateGamePhysics = () => {
    const f1 = f1Ref.current;
    const f2 = f2Ref.current;
    const fighters = [f1, f2];

    // Increment special charging passively
    f1.special = Math.min(100, f1.special + 0.05);
    f2.special = Math.min(100, f2.special + 0.05);

    // AI logic trigger
    if (mode === 'PvE') {
      processOpponentAI(f2, f1, 0.016);
    } else if (mode === 'Training') {
      // Idle target dummy in training, replenish state
      f2.hp = Math.min(100, f2.hp + 0.1);
      f1.hp = Math.min(100, f1.hp + 0.1);
      f2.vx *= 0.8;
      f2.dir = f1.x > f2.x ? 1 : -1;
      if (f2.hitStun > 0) f2.hitStun--;
    }

    // Cycle custom ground eruptions (Rex's fire walls)
    groundFirePillars.current.forEach((p, idx) => {
      p.timer--;
      if (p.timer <= 0) {
        p.warning = false;
        // Create full blast fire particle storm upwards!
        spawnBlastParticles(p.x, GROUND_Y, '#ff3311', 12, 1.4);
        
        // Eruption damage check against both fighters
        fighters.forEach((f) => {
          const dx = Math.abs(f.x + f.w/2 - p.x);
          if (dx < 60 && f.onGround && f.state !== 'ko') {
            applyCombatImpact(f, f.x > p.x ? 1 : -1, 14, 'special');
          }
        });
      }
    });
    // Filter expired ground eruptions
    groundFirePillars.current = groundFirePillars.current.filter(p => p.timer > -15);

    // Update Projectiles
    projectiles.current.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;

      // Check hits
      const target = p.ownerId === 'p1' ? f2 : f1;
      if (Math.abs(p.x - (target.x + target.w / 2)) < target.w / 2 + p.radius &&
          Math.abs(p.y - (target.y - target.h / 2)) < target.h / 2) {
        
        p.radius = 0; // Terminate projectile
        if (target.state !== 'ko') {
          applyCombatImpact(target, p.vx > 0 ? 1 : -1, p.damage, 'special');
        }
      }
    });
    projectiles.current = projectiles.current.filter((p) => p.radius > 0 && p.x > -50 && p.x < CW + 50);

    // Process both fighters physics
    fighters.forEach((f) => {
      const opp = f.id === 'p1' ? f2 : f1;
      
      // Hitstun recovery tick
      if (f.hitStun > 0) {
        f.hitStun--;
        f.vx *= 0.88; // Apply high slide friction
        if (f.hitStun === 0) f.state = 'idle';
      }
      
      // Blockstun recovery tick
      if (f.blockStun > 0) {
        f.blockStun--;
        f.vx *= 0.85;
        if (f.blockStun === 0) {
          f.state = 'idle';
          f.isBlocking = false;
        }
      }

      // Read keyboard inputs if fighter is currently control-capable
      if (f.hitStun <= 0 && f.blockStun <= 0 && f.state !== 'ko') {
        const isPlayer1 = f.id === 'p1';
        const keys = isPlayer1 ? activeKeysConfig1 : activeKeysConfig2;
        
        // Block check: Hold backwards direction relative to opponent position
        const holdingLeft = keysPressed.current[keys.left];
        const holdingRight = keysPressed.current[keys.right];
        const holdingDown = keysPressed.current[keys.down];
        
        f.crouching = holdingDown;

        // Face opponent naturally
        f.dir = opp.x > f.x ? 1 : -1;

        // Is blocking check
        const isBackingUp = (f.dir === 1 && holdingLeft) || (f.dir === -1 && holdingRight);
        f.isBlocking = isBackingUp && f.onGround && !f.attacking;

        // Horizontal velocity calculation
        const moveSpeed = 3.2 + (getFighterSpeed(f) * 0.45); // Speed stats maps to movement 3.65 - 5.45px/frame
        if (holdingLeft && !f.attacking) {
          f.vx = -moveSpeed;
          f.state = 'walk';
        } else if (holdingRight && !f.attacking) {
          f.vx = moveSpeed;
          f.state = 'walk';
        } else {
          f.vx *= 0.65; // High slide deceleration
          if (f.onGround && !f.attacking) f.state = f.crouching ? 'crouch' : 'idle';
        }

        // Jump trigger check
        if (keysPressed.current[keys.up] && f.onGround && !f.attacking) {
          f.vy = -13.6;
          f.onGround = false;
          f.state = 'jump';
          sfx.playJump();
        }
      }

      // Apply Gravity and Ground dampening
      f.x += f.vx;
      
      if (!f.onGround) {
        f.vy += GRAVITY;
        f.y += f.vy;
        if (f.y >= GROUND_Y) {
          f.y = GROUND_Y;
          f.vy = 0;
          f.onGround = true;
          // Spawn touch dust particles
          if (f.state === 'jump') f.state = 'idle';
          spawnBlastParticles(f.x + f.w/2, GROUND_Y, 'rgba(100,80,180,0.4)', 4, 0.4);
        }
      }

      // Check arena viewport bounds safely with padding
      f.x = Math.max(12, Math.min(CW - f.w - 12, f.x));

      // Combo Decay Timers
      if (f.comboTimer > 0) {
        f.comboTimer--;
        if (f.comboTimer === 0) {
          f.comboCount = 0;
          if (isP1(f)) setP1Combo(0); else setP2Combo(0);
        }
      }

      // Core combat Active striking frame check
      if (f.attacking) {
        f.attackTimer--;
        
        if (f.attackTimer <= 0) {
          f.attacking = false;
          f.attackType = null;
          f.attackHit = false;
        } else if (!f.attackHit) {
          // Strike registers inside specific active-frames depending on attack profile
          const threshold = f.attackType === 'special' ? 32 : (f.attackType === 'kick' ? 14 : 8);
          
          if (f.attackTimer === threshold) {
            const hitBox = calculateAttackHitbox(f);
            const oppBox = { x: opp.x, y: opp.y - opp.h, w: opp.w, h: opp.h };

            if (rectsOverlap(hitBox, oppBox)) {
              f.attackHit = true;
              
              // Calculate direction of impact blow
              const impactDir = f.x < opp.x ? 1 : -1;
              const dmg = f.attackType === 'special' ? 24 : (f.attackType === 'kick' ? 13 : 9);
              
              applyCombatImpact(opp, impactDir, dmg, f.attackType || 'punch');
              
              // Add attacker specific combo meter
              f.special = Math.min(100, f.special + (f.attackType === 'special' ? 0 : 16));
              f.comboCount++;
              f.comboTimer = 110;
              
              if (isP1(f)) {
                setP1Combo(f.comboCount);
                setP1Special(Math.round(f.special));
              } else {
                setP2Combo(f.comboCount);
                setP2Special(Math.round(f.special));
              }

              // Sola ultimate solar aura grants life on impact!
              if (f.attackType === 'special' && f.character.id === 'sola') {
                f.hp = Math.min(100, f.hp + 12);
                if (isP1(f)) setP1Hp(Math.round(f.hp)); else setP2Hp(Math.round(f.hp));
              }
            }
          }
        }
      }
    });

    // Handle Fighter character body overlap pushes (prevent phasing through characters)
    const p1Center = f1.x + f1.w / 2;
    const p2Center = f2.x + f2.w / 2;
    const spacing = Math.abs(p1Center - p2Center);
    const minDistance = (f1.w + f2.w) * 0.45;

    if (spacing < minDistance && f1.y === f2.y) {
      const push = (minDistance - spacing) * 0.5;
      if (p1Center < p2Center) {
        f1.x = Math.max(10, f1.x - push);
        f2.x = Math.min(CW - f2.w - 10, f2.x + push);
      } else {
        f1.x = Math.min(CW - f1.w - 10, f1.x + push);
        f2.x = Math.max(10, f2.x - push);
      }
    }

    // Particles system update
    particles.current.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22; // Gravity inside particles
      p.vx *= 0.95; // Drag
      p.life -= 0.035;
    });
    particles.current = particles.current.filter((p) => p.life > 0);

    // Screen Shake decay
    if (screenShake.current > 0) {
      screenShake.current -= 0.6;
    }
  };

  const isP1 = (f: Fighter) => f.id === 'p1';

  // Apply visual combat blow, calculate block vs heavy stuns, damage mitigation, and spark positioning
  const applyCombatImpact = (victim: Fighter, dir: number, rawDmg: number, type: AttackType) => {
    if (victim.state === 'ko') return;

    const attacker = victim.id === 'p1' ? f2Ref.current : f1Ref.current;
    
    // Scale damage based on attacker's power stats containing the selected weapon modifiers!
    const scaledRawDmg = Math.round(rawDmg * (0.8 + (getFighterPower(attacker) * 0.12)));
    
    let finalDmg = scaledRawDmg;
    const isSpecialAttack = type === 'special';
    const isKick = type === 'kick';

    // 1. Defend/Block calculations
    if (victim.isBlocking && !isSpecialAttack) {
      // Calculate high mitigation 
      const defenseStat = getFighterDefense(victim); // ranges 1 to 6
      const blockMitigationPercent = 0.75 + (defenseStat * 0.03); // blocks 78% to 93% of raw damage!
      finalDmg = Math.round(scaledRawDmg * (1 - blockMitigationPercent));

      victim.hp = Math.max(0, victim.hp - finalDmg);
      victim.blockStun = isKick ? 14 : 9;
      victim.state = 'block';
      victim.vx = dir * (isKick ? 4.5 : 2.5); // Pushback on shield
      
      sfx.playBlock();
      screenShake.current = 2.5;

      // Spark yellow glow elements
      const sx = victim.x + victim.w / 2;
      const sy = victim.y - victim.h / 2;
      spawnBlastParticles(sx, sy, '#ffd700', 6, 0.7);
    } else {
      // 2. Heavy hit landed successfully!
      const defenseStat = getFighterDefense(victim);
      // Mitigation factors 2-3% per point of defense
      const dmgMitigation = 0.95 - (defenseStat * 0.03);
      finalDmg = Math.round(scaledRawDmg * dmgMitigation);

      victim.hp = Math.max(0, victim.hp - finalDmg);
      
      // Determine stun frame counts
      victim.hitStun = isSpecialAttack ? 34 : (isKick ? 22 : 14);
      victim.state = 'hit';
      
      // Apply physical knockback forces
      victim.vx = dir * (isSpecialAttack ? 11.5 : (isKick ? 6.5 : 4.5));
      if (isSpecialAttack || isKick || !victim.onGround) {
        victim.vy = isSpecialAttack ? -11.0 : (isKick ? -6.5 : -3.5);
        victim.onGround = false;
      }

      sfx.playHit();
      screenShake.current = isSpecialAttack ? 14 : (isKick ? 7 : 4);

      // Hit Impact sparkles & debris
      const sx = victim.x + victim.w / 2;
      const sy = victim.y - victim.h / 2;
      spawnBlastParticles(sx, sy, victim.character.darkColor, 15, 1.2);
    }

    // Update HP states on HUD
    if (isP1(victim)) {
      setP1Hp(Math.round(victim.hp));
    } else {
      setP2Hp(Math.round(victim.hp));
    }

    // KO State Trigger Check
    if (victim.hp <= 0) {
      victim.state = 'ko';
      victim.hitStun = 0;
      victim.blockStun = 0;
      victim.vx = dir * 6.5;
      victim.vy = -7.5;
      victim.onGround = false;
      
      evaluateRoundWinner();
    }
  };

  // High quality procedural visual draw on HTML5 Canvas
  const renderGameCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    
    // Apply explosive Screen Shakes
    if (screenShake.current > 0) {
      const sx = (Math.random() - 0.5) * screenShake.current;
      const sy = (Math.random() - 0.5) * screenShake.current;
      ctx.translate(sx, sy);
    }

    ctx.clearRect(0, 0, CW, CH);

    // 1. SKY GRADIENT BACKDROP
    const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    skyGrad.addColorStop(0, stage.skyTop);
    skyGrad.addColorStop(1, stage.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CW, GROUND_Y);

    const spaceOffset = (f1Ref.current.x + f2Ref.current.x) * 0.03;

    // 2. SPARKLING RETRO ARCADE STARS / CYBER MOON
    if (stage.id === 'kyoto' || stage.id === 'sanctuary') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      const stars = [
        [35, 30], [110, 75], [190, 45], [260, 85], [320, 25], [390, 60], 
        [470, 35], [540, 90], [610, 40], [690, 80], [750, 45], [80, 110], 
        [180, 120], [290, 105], [410, 115], [530, 100], [660, 110], [730, 95]
      ];
      stars.forEach(([sx, sy]) => {
        const cx = (sx - spaceOffset + CW) % CW;
        ctx.fillRect(cx, sy, 1.5, 1.5);
      });
      
      // Cyber Moon
      ctx.save();
      ctx.shadowBlur = 35;
      ctx.shadowColor = stage.id === 'kyoto' ? '#ff0055' : '#00ccff';
      ctx.fillStyle = stage.id === 'kyoto' ? '#ffebf3' : '#f0fafe';
      ctx.beginPath();
      ctx.arc(670 - spaceOffset * 0.4, 75, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. PARALLAX CUSTOM STAGE OBJECTS
    const cityOffset = (f1Ref.current.x + f2Ref.current.x) * 0.08;
    
    if (stage.id === 'kyoto') {
      // Draw Japanese Pagodas with traditional multi-tiered roofs and hanging lanterns
      const pagodas = [
        { x: 90, scale: 0.8 },
        { x: 380, scale: 0.6 },
        { x: 640, scale: 0.75 },
      ];
      
      pagodas.forEach((p) => {
        const px = (p.x - cityOffset + CW + 100) % (CW + 200) - 100;
        ctx.save();
        ctx.fillStyle = '#0a0214';
        
        const baseH = p.scale * 170;
        const w = p.scale * 65;
        
        // Draw 3 layers of Pagoda structures
        for (let l = 0; l < 3; l++) {
          const ly = GROUND_Y - baseH + (l * (baseH / 3));
          const lw = w * (1 + (2 - l) * 0.16);
          const lh = baseH / 3.4;
          
          ctx.fillRect(px - lw/3, ly, (lw * 2)/3, lh);
          
          // Curved traditional roof corners
          ctx.beginPath();
          ctx.moveTo(px - lw * 0.7, ly + 4);
          ctx.quadraticCurveTo(px, ly - 6, px + lw * 0.7, ly + 4);
          ctx.lineTo(px + lw * 0.85, ly);
          ctx.quadraticCurveTo(px, ly - 14, px - lw * 0.85, ly);
          ctx.closePath();
          ctx.fillStyle = '#17062a';
          ctx.fill();
          ctx.fillStyle = '#0a0214';
        }
        
        // Pagoda tall peak spire
        ctx.fillRect(px - 1.5, GROUND_Y - baseH - 20, 3, 24);
        
        // Hanging glowing neon lantern bulbs on corner peaks
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff0055';
        ctx.fillStyle = '#ff66aa';
        ctx.beginPath();
        ctx.arc(px - w * 0.6, GROUND_Y - baseH * 0.7, 4.5, 0, Math.PI * 2);
        ctx.arc(px + w * 0.6, GROUND_Y - baseH * 0.7, 4.5, 0, Math.PI * 2);
        ctx.arc(px - w * 0.5, GROUND_Y - baseH * 0.38, 5.5, 0, Math.PI * 2);
        ctx.arc(px + w * 0.5, GROUND_Y - baseH * 0.38, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    } else if (stage.id === 'sanctuary') {
      // Draw Colossal Stone Swords half embedded in ground
      const giantSwords = [
        { x: 120, rot: -0.16, h: 250, w: 24 },
        { x: 390, rot: 0.14, h: 330, w: 30 },
        { x: 670, rot: -0.06, h: 230, w: 20 },
      ];
      
      giantSwords.forEach((sw) => {
        const swx = (sw.x - cityOffset + CW + 100) % (CW + 200) - 100;
        ctx.save();
        ctx.translate(swx, GROUND_Y);
        ctx.rotate(sw.rot);
        
        // Blade body
        const grad = ctx.createLinearGradient(-sw.w/2, -sw.h, sw.w/2, -sw.h);
        grad.addColorStop(0, '#060e1b');
        grad.addColorStop(0.5, '#15243c');
        grad.addColorStop(1, '#02050b');
        ctx.fillStyle = grad;
        
        ctx.beginPath();
        ctx.moveTo(-sw.w/2, -sw.h * 0.15); // bottom
        ctx.lineTo(-sw.w/2, -sw.h + 45);   // tip segment
        ctx.lineTo(0, -sw.h);               // sharp tip point
        ctx.lineTo(sw.w/2, -sw.h + 45);
        ctx.lineTo(sw.w/2, -sw.h * 0.15);
        ctx.closePath();
        ctx.fill();
        
        // Heavy guard
        ctx.fillStyle = '#030811';
        ctx.fillRect(-sw.w * 0.9, -sw.h * 0.15, sw.w * 1.8, 18);
        
        // Hilt embedded in base ground floor
        ctx.fillStyle = '#08101d';
        ctx.fillRect(-sw.w * 0.22, 0, sw.w * 0.44, 25);
        
        ctx.restore();
      });
    } else {
      // Solaris Forge backgrounds: industrial piping, liquid lava conduits, and heavy furnace exhaust
      const pipelines = [
        { y: 70, h: 16 },
        { y: 150, h: 22 },
      ];
      
      pipelines.forEach((pl) => {
        ctx.save();
        ctx.fillStyle = '#1a0804';
        ctx.fillRect(0, pl.y, CW, pl.h);
        
        // Glowing molten lava core
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ff6600';
        ctx.fillStyle = '#ffaa22';
        ctx.fillRect(0, pl.y + pl.h / 3.2, CW, pl.h / 3);
        ctx.restore();
      });
      
      // Background Machinery / Exhaust chimneys
      const machinery = [190, 560];
      machinery.forEach((mx) => {
        const bx = (mx - cityOffset + CW + 100) % (CW + 200) - 100;
        ctx.save();
        ctx.fillStyle = '#160401';
        ctx.fillRect(bx - 40, GROUND_Y - 170, 80, 170);
        
        // Molten viewport core
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#ff4400';
        ctx.fillStyle = '#ff7700';
        ctx.beginPath();
        ctx.arc(bx, GROUND_Y - 60, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(bx, GROUND_Y - 60, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // 4. ARENA FLOOR WITH COLORFUL GRID DEPTH
    const floorGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CH);
    floorGrad.addColorStop(0, stage.groundTop);
    floorGrad.addColorStop(1, stage.groundBottom);
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, GROUND_Y, CW, CH - GROUND_Y);

    // Dynamic weather weather particles (Cherry blossoms, heavy raindrops, volcanic sparks)
    const time = Date.now() * 0.001;
    if (stage.particleType === 'blossom') {
      ctx.fillStyle = stage.ambientParticleColor;
      for (let i = 0; i < 28; i++) {
        const pSpeedY = 1.1;
        const pSpeedX = -0.6;
        const startX = (i * 47) % CW;
        const startY = (i * 31) % (GROUND_Y + 100);
        
        const px = (startX + pSpeedX * time * 50) % CW;
        const py = (startY + pSpeedY * time * 50) % (GROUND_Y + 40);
        const sway = Math.sin(time + i) * 8;
        
        ctx.save();
        ctx.globalAlpha = 0.65;
        ctx.beginPath();
        ctx.arc(px + sway, py, 3 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (stage.particleType === 'rain') {
      // Draw weather drops
      ctx.strokeStyle = stage.ambientParticleColor;
      ctx.lineWidth = 1.0;
      for (let i = 0; i < 45; i++) {
        const pSpeedY = 6.2;
        const pSpeedX = -1.2;
        const startX = (i * 39) % CW;
        const startY = (i * 27) % GROUND_Y;
        
        const px = (startX + pSpeedX * time * 65) % CW;
        const py = (startY + pSpeedY * time * 65) % GROUND_Y;
        
        ctx.save();
        ctx.globalAlpha = 0.35 + (i % 4) * 0.12;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + 3.5, py + 12);
        ctx.stroke();
        ctx.restore();
      }

      // Draw puddle rings splashing flat on the ground plane
      ctx.strokeStyle = 'rgba(0, 204, 255, 0.24)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const rx = (Date.now() * (0.08 + i * 0.04)) % CW;
        const ry = GROUND_Y + 5 + (i * 18) % (CH - GROUND_Y - 15);
        ctx.beginPath();
        ctx.ellipse(rx, ry, 5 + i * 2, 1.5 + i * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (stage.particleType === 'spark') {
      ctx.fillStyle = stage.ambientParticleColor;
      for (let i = 0; i < 28; i++) {
        const pSpeedY = -1.4;
        const pSpeedX = (i % 2 === 0 ? 0.25 : -0.25);
        const startX = (i * 53) % CW;
        const startY = (i * 19) % 250 + 100;
        
        const px = (startX + pSpeedX * time * 40) % CW;
        const py = GROUND_Y - ((startY + pSpeedY * time * 45) % 250);
        
        ctx.save();
        ctx.globalAlpha = 0.4 + Math.sin(time * 2.2 + i) * 0.4;
        ctx.shadowBlur = 4;
        ctx.shadowColor = stage.ambientParticleColor;
        ctx.fillRect(px, py, 1.5 + (i % 3), 1.5 + (i % 3));
        ctx.restore();
      }
    }

    // Neon floor dividing boundary line
    ctx.strokeStyle = stage.neonLine;
    ctx.lineWidth = 3.5;
    ctx.shadowBlur = 15;
    ctx.shadowColor = stage.neonLine;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CW, GROUND_Y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Depth Grid Lines on Floor
    ctx.strokeStyle = stage.gridLine;
    ctx.lineWidth = 1;
    for (let x = -100; x < CW + 200; x += 55) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y);
      ctx.lineTo(x - 90, CH);
      ctx.stroke();
    }
    for (let y = GROUND_Y + 15; y < CH; y += 18) {
      const alphaScalar = (1 - (y - GROUND_Y) / (CH - GROUND_Y));
      ctx.strokeStyle = stage.gridLine.replace(/[\d\.]+\)$/, `${0.2 * alphaScalar})`);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CW, y);
      ctx.stroke();
    }

    // 5. DRAW ACTIVE ERUPTION SHIELDS / PILLARS
    groundFirePillars.current.forEach((p) => {
      // Draw flashing solar warning circle on floor
      if (p.warning) {
        ctx.strokeStyle = p.timer % 6 < 3 ? '#ff3311' : '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x - 30, GROUND_Y - 4, 60, 8);
        ctx.fillStyle = 'rgba(255,50,0,0.15)';
        ctx.fillRect(p.x - 30, GROUND_Y - 4, 60, 8);
      } else {
        // Draw rising fire blast column
        const fireGrad = ctx.createLinearGradient(p.x, GROUND_Y, p.x, GROUND_Y - 260);
        fireGrad.addColorStop(0, '#ff3311');
        fireGrad.addColorStop(0.5, '#fa7a00');
        fireGrad.addColorStop(1, 'rgba(255,234,0,0)');
        ctx.fillStyle = fireGrad;
        ctx.fillRect(p.x - 35, GROUND_Y - 260, 70, 260);
      }
    });

    // 6. DRAW PROJECTILES
    projectiles.current.forEach((p) => {
      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = p.color;
      
      const beamGrad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.radius);
      beamGrad.addColorStop(0, '#ffffff');
      beamGrad.addColorStop(0.4, p.color);
      beamGrad.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 7. DRAW COMBAT FIGHTERS PROCEDURALLY
    drawProceduralFighter(ctx, f1Ref.current);
    drawProceduralFighter(ctx, f2Ref.current);

    // 8. RENDER DUST / SPARKS PARTICLES
    particles.current.forEach((p) => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0; // Reset canvas values

    ctx.restore();
  };

  // Helper code to procedural generate stunning weapon visuals matching selected spriteType
  const drawProceduralWeapon = (ctx: CanvasRenderingContext2D, w: Weapon, active: boolean) => {
    ctx.save();
    
    // Scale by design factor
    ctx.scale(w.visualScale, w.visualScale);
    
    const wColor = w.glowColor;
    ctx.shadowBlur = active ? 24 : 8;
    ctx.shadowColor = wColor;
    
    if (w.spriteType === 'twin_daggers') {
      // Crossed twin blades
      ctx.fillStyle = '#222226';
      ctx.fillRect(-1.5, -5, 3, 6); // Handle
      ctx.fillStyle = wColor;
      ctx.fillRect(-4, 1.0, 8, 1.5); // Guard
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-1.5, 2.5, 3, 16); // Blade
      
      ctx.rotate(Math.PI / 3.2);
      ctx.fillStyle = '#222226';
      ctx.fillRect(-1.5, -5, 3, 6);
      ctx.fillStyle = wColor;
      ctx.fillRect(-4, 1.0, 8, 1.5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-1.5, 2.5, 3, 16);
    } else if (w.spriteType === 'claws') {
      // Triple energy emitting short claws
      ctx.fillStyle = '#1c1c1f';
      ctx.fillRect(-6, -4, 12, 5); // Base glove plate
      ctx.fillStyle = wColor;
      ctx.fillRect(-4.5, 1, 1.8, 15); // Claw L
      ctx.fillRect(-0.9, 2, 1.8, 18); // Claw M
      ctx.fillRect(2.7, 1, 1.8, 15);  // Claw R
    } else if (w.spriteType === 'claymore') {
      // Chunky heavy two-handed broadsword
      ctx.fillStyle = '#1c1c1f';
      ctx.fillRect(-3, -11, 6, 11); // Handle
      ctx.fillStyle = '#3a334a';
      ctx.fillRect(-11, 0, 22, 4); // Wider bulky guard
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4.5, 4, 9, 36); // Thick heavy steel
      ctx.strokeStyle = wColor;
      ctx.lineWidth = 1.8;
      ctx.strokeRect(-4.5, 4, 9, 36);
    } else if (w.spriteType === 'mace') {
      // molten rock spiked bludgeon mace
      ctx.fillStyle = '#1e1c24';
      ctx.fillRect(-2, -9, 4, 12); // Shaft
      ctx.fillStyle = '#3a3545';
      ctx.beginPath();
      ctx.arc(0, 9, 8, 0, Math.PI * 2); // Core spiked ball
      ctx.fill();
      ctx.fillStyle = wColor;
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        ctx.save();
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(-1.8, 7);
        ctx.lineTo(0, 12);
        ctx.lineTo(1.8, 7);
        ctx.fill();
        ctx.restore();
      }
    } else if (w.spriteType === 'halberd') {
      // Elongated pole-arm glaive
      ctx.fillStyle = '#2c1e18';
      ctx.fillRect(-1.2, -26, 2.4, 38); // Long wood staff
      ctx.fillStyle = '#5c526d';
      ctx.fillRect(-5, 10, 10, 3); // Socket joiner
      // Axe side blade
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-4, 14, 6, -Math.PI / 2, Math.PI / 2, true);
      ctx.fill();
      // glowing center tip
      ctx.fillStyle = wColor;
      ctx.beginPath();
      ctx.moveTo(-2.5, 12);
      ctx.lineTo(0, 24);
      ctx.lineTo(2.5, 12);
      ctx.fill();
    } else {
      // Standard glowing energy saber/katana
      ctx.fillStyle = '#1c1c1f';
      ctx.fillRect(-1.8, -9, 3.6, 9); // Hilt
      ctx.fillStyle = wColor;
      ctx.fillRect(-5.5, 0, 11, 3); // Handguard
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, 3, 4, 30); // Glowing blade
      ctx.strokeStyle = wColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-2, 3, 4, 30);
    }

    ctx.restore();
  };

  // High precision character rendering
  const drawProceduralFighter = (ctx: CanvasRenderingContext2D, f: Fighter) => {
    const { x, y, w, h, dir, state, character, crouching, onGround } = f;
    const isHurt = state === 'hit';
    const isBlock = state === 'block';
    
    // Choose flicker colors on hits
    let mainColor = isHurt ? '#ffffff' : character.color;
    let darkColor = isHurt ? '#8c8c8c' : character.darkColor;

    ctx.save();
    
    // Position alignment helper
    ctx.translate(x + w / 2, y);
    ctx.scale(dir, 1); // Auto orientation flip

    // Apply shadow glow
    ctx.shadowBlur = 12;
    ctx.shadowColor = mainColor;

    // A. FOOT SEGMENTS AND LEGS STRIDE ANIMATION
    const striding = onGround && Math.abs(f.vx) > 0.1;
    const strideTime = Date.now() * 0.012;
    const legLeftYOffset = striding ? Math.sin(strideTime) * 10 : 0;
    const legRightYOffset = striding ? -Math.sin(strideTime) * 10 : 0;
    
    const bodyHeight = crouching ? h * 0.65 : h;
    const groundOffset = crouching ? -20 : -32;

    // Draw Left Leg (Background side)
    ctx.fillStyle = darkColor;
    ctx.fillRect(-18, groundOffset + (onGround ? legLeftYOffset : 8), 12, onGround ? (crouching ? 20 : 32 - legLeftYOffset) : 22);

    // Draw Right Leg (Foreground side)
    ctx.fillStyle = mainColor;
    ctx.fillRect(6, groundOffset + (onGround ? legRightYOffset : 8), 12, onGround ? (crouching ? 20 : 32 - legRightYOffset) : 22);

    // B. METALLIC GLOWING TORSO PLATE (Crouch positioning)
    ctx.fillStyle = mainColor;
    const torsoY = -bodyHeight + h * 0.32;
    const torsoH = bodyHeight - h * 0.55;
    ctx.fillRect(-20, torsoY, 40, torsoH);

    // Torso base center energy core
    const energyCoreFlicker = Math.sin(Date.now() * 0.015) * 4 + 8;
    ctx.shadowBlur = energyCoreFlicker + 6;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, torsoY + torsoH / 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 12; // Reset standard blur limit

    const activeWeapon = f.id === 'p1' ? p1Weapon : p2Weapon;

    // SHEATHED/DIAGONAL WEAPON CARRIED ON BACK (when not attacking/blocking)
    if (!f.attacking && state !== 'block' && state !== 'ko') {
      ctx.save();
      // Translate diagonally behind the torso
      ctx.translate(-12, -bodyHeight + 38);
      ctx.rotate(Math.PI / 5.5); // Slanted diagonal hilt sheathed
      
      drawProceduralWeapon(ctx, activeWeapon, false);
      
      ctx.restore();
    }

    // C. PUNCH/KICK ATTACK ANIMATION ARMS
    if (f.attacking) {
      ctx.fillStyle = '#ffffff';
      
      if (f.attackType === 'punch') {
        const reach = 28 + (f.attackTimer * 0.4); // Extends arm out
        ctx.fillRect(12, -bodyHeight + 35, reach, 8); // Arm link
        
        ctx.save();
        ctx.translate(12 + reach, -bodyHeight + 35);
        // Animate sword swing sweep based on timer progress
        const swingProgress = f.attackTimer / 20.0;
        const swordAngle = -Math.PI / 3 + (swingProgress * Math.PI * 1.15); // Dramatic 210 degree slash swing rotation!
        ctx.rotate(swordAngle);
        
        drawProceduralWeapon(ctx, activeWeapon, true);
        
        ctx.restore();
        
        // Draw the glowing Slash Trace arc line in front of player
        ctx.save();
        ctx.shadowBlur = 18;
        ctx.shadowColor = character.color;
        ctx.strokeStyle = character.color;
        ctx.lineWidth = character.id === 'rex' || character.id === 'sola' ? 6 : 3.5;
        ctx.beginPath();
        ctx.arc(0, -bodyHeight + 35, 50 + f.attackTimer * 0.8, -Math.PI / 3.5, Math.PI / 3.5);
        ctx.stroke();
        ctx.restore();
      } else if (f.attackType === 'kick') {
        const kickExtent = 30 + (f.attackTimer * 0.4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(10, groundOffset - 2, kickExtent, 9); // Sweep arm base
        
        ctx.save();
        ctx.translate(10 + kickExtent, groundOffset + 2);
        ctx.rotate(Math.PI / 2.3); // pointed down low sweep thrust posture
        
        ctx.fillStyle = '#222226';
        ctx.fillRect(-1.8, -6, 3.6, 6);
        ctx.fillStyle = character.color;
        ctx.fillRect(-5, 0, 10, 2.5);
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = character.color;
        ctx.fillStyle = '#ffffff';
        const bladeW = character.id === 'kai' ? 3.2 : 6.5;
        const bladeL = character.id === 'kai' ? 28 : 38;
        ctx.fillRect(-bladeW/2, 2.5, bladeW, bladeL);
        ctx.restore();
        
        // Floor level dusty sweep trace line
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = character.color;
        ctx.strokeStyle = character.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, groundOffset + 2, 42, 0, Math.PI / 4);
        ctx.stroke();
        ctx.restore();
      } else if (f.attackType === 'special') {
        if (character.id === 'kai') {
          // Volt breaker charge pose - projecting Volt Katana straight out covered in dynamic lightning sparks
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(14, -bodyHeight + 35, 35, 7);
          
          ctx.save();
          ctx.translate(49, -bodyHeight + 35);
          ctx.rotate(Math.PI / 2); // direct horizontal stab
          
          ctx.fillStyle = '#1c1c1f';
          ctx.fillRect(-2, -8, 4, 8);
          ctx.fillStyle = character.color;
          ctx.fillRect(-8, 0, 16, 3);
          
          ctx.shadowBlur = 30;
          ctx.shadowColor = '#00ccff';
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-2, 3, 4, 45); // Katana body
          ctx.restore();

          // Spawn crackling sharp zig-zag electrostatic arcs!
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#00ccff';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.moveTo(15, -bodyHeight + 35);
          ctx.lineTo(40, -bodyHeight + 10);
          ctx.lineTo(65, -bodyHeight + 45);
          ctx.lineTo(95, -bodyHeight + 25);
          ctx.stroke();
        } else if (character.id === 'rex') {
          // Meteor crush pose - swinging gigantic molten claymore overhead down into ground floor
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(10, -bodyHeight + 25, 22, 9);
          
          ctx.save();
          ctx.translate(32, -bodyHeight + 25);
          ctx.rotate(Math.PI * 0.78); // Crushing downward swing angle
          
          ctx.fillStyle = '#1c1c1f';
          ctx.fillRect(-3, -14, 6, 14);
          ctx.fillStyle = character.color;
          ctx.fillRect(-11, 0, 22, 4.5);
          
          ctx.shadowColor = '#ff3311';
          ctx.shadowBlur = 35;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-4.5, 4.5, 9, 56); // Massive molten sword body
          ctx.restore();
          
          // Flame flares rising directly around the arm area
          ctx.fillStyle = '#ff6600';
          ctx.fillRect(10, groundOffset - 6, 25, 22);
        } else if (character.id === 'luna') {
          // Phantom Drift beam pose - cross daggers horizontally and focus purple void singularity core sphere
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(10, -bodyHeight + 33, 20, 7);
          
          ctx.save();
          ctx.translate(30, -bodyHeight + 33);
          ctx.rotate(-Math.PI / 4.5);
          ctx.fillStyle = character.color;
          ctx.fillRect(-5, 0, 10, 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-1.5, 2, 3, 20);
          ctx.restore();
          
          ctx.save();
          ctx.translate(30, -bodyHeight + 39);
          ctx.rotate(Math.PI / 4.5);
          ctx.fillStyle = character.color;
          ctx.fillRect(-5, 0, 10, 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-1.5, 2, 3, 20);
          ctx.restore();
          
          // Void singularity vortex orb centered in front
          ctx.save();
          ctx.shadowBlur = 25;
          ctx.shadowColor = '#bb33ff';
          ctx.fillStyle = 'rgba(187, 51, 255, 0.42)';
          ctx.beginPath();
          ctx.arc(42, -bodyHeight + 36, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(42, -bodyHeight + 36, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (character.id === 'sola') {
          // Raised Golden Sunstone Claymore posing shield activation
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(8, -bodyHeight + 20, 8, 22); 
          
          ctx.save();
          ctx.translate(12, -bodyHeight - 4);
          ctx.rotate(-Math.PI); // flipped upside down pointing vertically up
          
          ctx.fillStyle = '#1c1c1f';
          ctx.fillRect(-3, -11, 6, 11);
          ctx.fillStyle = character.color;
          ctx.fillRect(-10, 0, 20, 3.5);
          
          ctx.shadowBlur = 32;
          ctx.shadowColor = '#ffcc00';
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-3.5, 3.5, 7, 46); // Golden edge blade
          ctx.restore();
          
          // Glowing sunburst protective shield aura overlay
          ctx.strokeStyle = '#ffcc00';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(0, -bodyHeight / 2, 42, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = 'rgba(255, 204, 0, 0.14)';
          ctx.fill();
        }
      }
    } else if (isBlock) {
      // Shield block posture
      ctx.strokeStyle = stage.neonLine;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(18, -bodyHeight + 10);
      ctx.lineTo(18, groundOffset + 10);
      ctx.stroke();
    } else {
      // Swinging posture hands
      const armSwing = Math.sin(Date.now() * 0.008) * 3.5;
      ctx.fillStyle = darkColor;
      ctx.fillRect(-22, -bodyHeight + 30, 7, 18 + armSwing);
      ctx.fillStyle = mainColor;
      ctx.fillRect(16, -bodyHeight + 30 + armSwing, 7, 18 - armSwing);
    }

    // D. GLOWING SUB-SYSTEM HEAD AND VISOR
    const headY = -bodyHeight + 14;
    ctx.shadowBlur = 10;
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.arc(0, headY, 15, 0, Math.PI * 2);
    ctx.fill();

    // Vision Visor
    ctx.fillStyle = isHurt ? '#ff0000' : (isBlock ? '#00e5ff' : '#000001');
    ctx.fillRect(4, headY - 5, 12, 8);
    // Extra visual dot
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(12, headY - 4, 3, 3);

    // E. SELECTION INDICATION OVERLAYS
    if (f.special >= 100 && (Math.floor(Date.now() * 0.005) % 2 === 0)) {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#ffff00';
      ctx.strokeRect(-24, -bodyHeight - 10, 48, bodyHeight + 16);
    }

    ctx.restore();
  };

  return (
    <div className="w-full flex flex-col gap-4 max-w-4xl mx-auto select-none">
      {/* 1. TOP STATUS PANEL INTERFACE */}
      <div className="bg-[#000002] border border-purple-500/20 rounded-xl p-4 flex flex-col gap-2 relative z-10 font-mono shadow-2xl">
        {/* Match Header */}
        <div className="flex justify-between items-center text-xs text-gray-500 tracking-wider">
          <button
            onClick={() => { sfx.playChime(); onExit(); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-purple-950/60 bg-[#0f041b] rounded text-[10px] text-purple-400 hover:text-white hover:bg-purple-950 transition-all uppercase"
          >
            <ArrowLeft className="w-3 h-3" />
            Lobby Menu  
          </button>
          
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-purple-950/20 border border-purple-900/30 px-3 py-1 rounded-full text-[10px] font-bold text-purple-400 uppercase tracking-widest leading-none">
              {mode === 'PvE' ? `Vs AI (${difficulty})` : mode === 'Training' ? 'Practice Gym' : 'Versus local 2P'}
            </div>
            <div className="hidden sm:flex gap-1 bg-purple-950/20 border border-purple-900/30 px-3 py-1.5 rounded-full text-[9px] font-bold text-yellow-400 uppercase tracking-widest leading-none items-center">
              📍 {stage.name}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { sfx.playChime(); setShowControlsGuide(!showControlsGuide); }}
              className="text-gray-400 hover:text-white"
              title="Controls Helper"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const isMutedNow = sfx.toggleMute();
                setMuted(isMutedNow);
              }}
              className="text-gray-400 hover:text-white"
            >
              {muted ? <VolumeX className="w-4 h-4 text-orange-500" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* HEALTHBARS & CENTRAL TIMER GRID */}
        <div className="grid grid-cols-12 items-center gap-2 mt-1">
          {/* PLAYER 1 METERS */}
          <div className="col-span-5 flex flex-col gap-1 text-left">
            <div className="flex justify-between items-baseline">
              <span className="font-extrabold text-sm md:text-base tracking-wider uppercase" style={{ color: p1Char.color }}>{p1Char.name}</span>
              <div className="flex gap-1 mb-0.5">
                {[...Array(2)].map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border border-cyan-800 flex items-center justify-center text-[8px] font-bold ${
                      p1Wins > idx ? 'bg-cyan-400 border-cyan-400 text-black shadow-[0_0_8px_#00ccff]' : 'bg-transparent text-gray-700'
                    }`}
                  >
                    W
                  </div>
                ))}
              </div>
            </div>
            
            {/* Health Bar Base Wrap */}
            <div className="h-4 w-full bg-[#1e102e] border border-cyan-500/20 rounded overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
              <div
                className="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-white transition-all duration-75"
                style={{
                  width: `${p1Hp}%`,
                  boxShadow: p1Hp > 0 ? `0 0 8px ${p1Char.color}` : 'none',
                }}
              />
              <span className="absolute right-2 top-0.5 text-[8px] font-black text-cyan-200">{p1Hp}/100 hp</span>
            </div>

            {/* Special Burst Meter */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[8px] font-bold text-purple-400 tracking-widest uppercase">SPM</span>
              <div className="h-2 flex-1 bg-[#150a22] border border-purple-500/10 rounded overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-fuchsia-400 transition-all duration-100"
                  style={{ width: `${p1Special}%` }}
                />
              </div>
              <span className={`text-[8px] font-extrabold ${p1Special >= 100 ? 'text-yellow-400 animate-pulse' : 'text-purple-400'}`}>
                {p1Special >= 100 ? 'READY' : `${p1Special}%`}
              </span>
            </div>
          </div>

          {/* CHRONO TIMER */}
          <div className="col-span-2 text-center flex flex-col justify-center items-center">
            <span className="text-2xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 font-mono tracking-tight select-none">
              {timer}
            </span>
            <span className="text-[8px] font-bold tracking-widest text-purple-500 uppercase mt-0.5">
              ROUND {round}
            </span>
          </div>

          {/* PLAYER 2 / AI METERS */}
          <div className="col-span-5 flex flex-col gap-1 text-right">
            <div className="flex justify-between items-baseline flex-row-reverse">
              <span className="font-extrabold text-sm md:text-base tracking-wider uppercase" style={{ color: p2Char.color }}>{p2Char.name}</span>
              <div className="flex gap-1 mb-0.5">
                {[...Array(2)].map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border border-orange-850 flex items-center justify-center text-[8px] font-bold ${
                      p2Wins > idx ? 'bg-orange-500 border-orange-500 text-black shadow-[0_0_8px_#ff4400]' : 'bg-transparent text-gray-700'
                    }`}
                  >
                    W
                  </div>
                ))}
              </div>
            </div>
            
            {/* Health Bar Base Wrap */}
            <div className="h-4 w-full bg-[#1e102e] border border-orange-500/20 rounded overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] direction-rtl">
              <div
                className="h-full bg-gradient-to-l from-orange-600 via-orange-400 to-white transition-all duration-75 ml-auto"
                style={{
                  width: `${p2Hp}%`,
                  boxShadow: p2Hp > 0 ? `0 0 8px ${p2Char.color}` : 'none',
                }}
              />
              <span className="absolute left-2 top-0.5 text-[8px] font-black text-orange-200">{p2Hp}/100 hp</span>
            </div>

            {/* Special Burst Meter */}
            <div className="flex items-center gap-1.5 mt-0.5 justify-end">
              <span className={`text-[8px] font-extrabold ${p2Special >= 100 ? 'text-yellow-400 animate-pulse' : 'text-orange-400'}`}>
                {p2Special >= 100 ? 'READY' : `${p2Special}%`}
              </span>
              <div className="h-2 w-28 bg-[#150a22] border border-orange-500/10 rounded overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-l from-orange-600 to-yellow-400 transition-all duration-100 ml-auto"
                  style={{ width: `${p2Special}%` }}
                />
              </div>
              <span className="text-[8px] font-bold text-orange-400 tracking-widest uppercase">SPM</span>
            </div>
          </div>
        </div>
      </div>

      {/* RETRO ARCADE LIVE COMMENTARY TICKER */}
      <div className="w-full bg-[#0c0417]/80 backdrop-blur border border-purple-500/25 px-4 py-2 rounded-lg text-center flex items-center justify-center gap-2.5 shadow-[0_0_12px_rgba(168,85,247,0.06)] select-none">
        <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#ffd700] shrink-0 animate-pulse bg-yellow-950/45 px-2 py-0.5 border border-yellow-800 rounded flex items-center gap-1 font-mono leading-none">
          <Award className="w-3.5 h-3.5 text-yellow-500" /> Announcer
        </span>
        <span className="text-xs font-mono font-medium text-purple-200 truncate leading-none">
          "{commentary || "ROUND 1! PREPARE YOUR WEAPONS... TIME TO DUEL!"}"
        </span>
      </div>

      {/* 2. MAIN ACTIVE CANVAS VIEWPORT CONTAINER */}
      <div 
        ref={containerRef}
        className="w-full aspect-[16/9] bg-stone-950 rounded-xl relative overflow-hidden border border-purple-950 flex items-center justify-center"
      >
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          className="block outline-none"
        />

        {/* Dynamic Combo Highlight Prompts */}
        {p1Combo >= 2 && (
          <div 
            className="absolute left-6 top-1/4 animate-bounce bg-cyan-950/60 border-2 border-cyan-400 rounded-lg p-2.5 flex flex-col items-center shadow-[0_0_15px_#00ccff55]"
            style={{ color: p1Char.color }}
          >
            <span className="text-2xl font-black">{p1Combo}x</span>
            <span className="text-[8px] uppercase tracking-widest font-extrabold">COMBO CRITICAL</span>
          </div>
        )}

        {p2Combo >= 2 && (
          <div 
            className="absolute right-6 top-1/4 animate-bounce bg-orange-950/60 border-2 border-orange-500 rounded-lg p-2.5 flex flex-col items-center shadow-[0_0_15px_#ff440055]"
            style={{ color: p2Char.color }}
          >
            <span className="text-2xl font-black">{p2Combo}x</span>
            <span className="text-[8px] uppercase tracking-widest font-extrabold font-mono">COMBO CRITICAL</span>
          </div>
        )}

        {/* Quick Paused Overlay Screen */}
        {paused && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 text-center z-30 animate-fade-in">
            <h2 className="text-3xl font-black tracking-widest text-purple-400 uppercase drop-shadow-[0_0_12px_rgba(147,51,234,0.5)]">MATCH PAUSED</h2>
            <p className="text-xs text-gray-400">Perfect your strategy or exit to selections lobby</p>
            <div className="flex gap-2">
              <button
                onClick={() => { sfx.playChime(); setPaused(false); }}
                className="px-5 py-2 hover:bg-purple-500 border border-purple-500 text-white font-bold rounded text-xs uppercase transition-all"
              >
                Resume Fight
              </button>
              <button
                onClick={() => { sfx.playChime(); resetWholeMatch(); setPaused(false); }}
                className="px-5 py-2 hover:bg-orange-600 border border-orange-500 text-white font-bold rounded text-xs uppercase transition-all"
              >
                Restart Round
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Warning Indicator Overlay during Ultimates */}
        {f1Ref.current.attacking && f1Ref.current.attackType === 'special' && f1Ref.current.attackTimer > 32 && (
          <div className="absolute inset-0 bg-cyan-950/15 pointer-events-none flex items-center justify-center border-t-2 border-b-2 border-cyan-400 animate-pulse z-40">
            <div className="text-cyan-300 font-extrabold text-sm uppercase tracking-[0.25em] flex items-center gap-1 bg-black/70 px-4 py-2 border border-cyan-800 rounded">
              <Zap className="w-5 h-5 text-yellow-400 animate-spin" />
              ULTIMATE SECRET TRIGGERED : {p1Char.specialName.toUpperCase()}
            </div>
          </div>
        )}

        {f2Ref.current.attacking && f2Ref.current.attackType === 'special' && f2Ref.current.attackTimer > 32 && (
          <div className="absolute inset-0 bg-orange-950/15 pointer-events-none flex items-center justify-center border-t-2 border-b-2 border-orange-500 animate-pulse z-40">
            <div className="text-orange-300 font-extrabold text-sm uppercase tracking-[0.25em] flex items-center gap-1 bg-black/70 px-4 py-2 border border-orange-850 rounded">
              <Flame className="w-5 h-5 text-orange-500 animate-bounce" />
              ULTIMATE SECRET TRIGGERED : {p2Char.specialName.toUpperCase()}
            </div>
          </div>
        )}

        {/* Dynamic Display of Round End Banner overlays */}
        {winnerText && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-4 text-center z-30">
            <div className={roundWinner === 'p1' ? 'text-cyan-400 text-2xl md:text-4xl font-extrabold tracking-widest uppercase' : roundWinner === 'p2' ? 'text-orange-400 text-2xl md:text-4xl font-extrabold tracking-widest uppercase' : 'text-yellow-400 text-2xl md:text-3xl font-bold tracking-widest uppercase'}>
              {winnerText}
            </div>
            {!matchOver ? (
              <span className="text-xs text-gray-400 mt-2 tracking-widest uppercase">LOADING NEXT ROUND GALLERY...</span>
            ) : (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={resetWholeMatch}
                  className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold rounded-md text-xs tracking-wider uppercase transition-all"
                >
                  REPLAY FIGHT MATCH
                </button>
                <button
                  onClick={onExit}
                  className="px-6 py-2.5 bg-purple-950 border border-purple-800 text-purple-300 hover:text-white rounded-md text-xs tracking-wider uppercase transition-all"
                >
                  EXIT TO MAIN MENU
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. BUTTONS PANEL OVERLAYS */}
      <div className="flex gap-2 justify-between items-center text-xs">
        <button
          onClick={() => { sfx.playChime(); setPaused(!paused); }}
          className="flex items-center gap-1 px-4 py-2 bg-purple-950/40 border border-purple-900/40 text-purple-300 rounded font-bold hover:bg-purple-950"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {paused ? 'Resume Game' : 'Pause Match'}
        </button>

        {/* Screen/Keyboard Helper Guide popup wrapper */}
        {showControlsGuide && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-[#0b0314] border border-purple-500 rounded-xl p-5 max-w-md w-full relative font-mono text-xs">
              <button
                onClick={() => { sfx.playChime(); setShowControlsGuide(false); }}
                className="absolute top-2 right-2 text-gray-500 hover:text-white"
              >
                ✕
              </button>
              <h3 className="text-sm font-black text-purple-400 tracking-wider uppercase mb-3 text-center flex items-center gap-1.5 justify-center">
                <Shield className="w-4 h-4 text-cyan-400" /> RETRO STREET DUEL COMBO GUIDE
              </h3>
              <div className="space-y-2 text-gray-300 leading-relaxed text-left">
                <p><strong className="text-yellow-400 uppercase">🛡️ Block Mechanic:</strong> Holding the direction opposite to your opponent (e.g. holding A when facing right) puts you into a blocking state, reducing incoming standard damage by <strong className="text-white">80%</strong> and avoiding heavy hitstun!</p>
                <p><strong className="text-yellow-400 uppercase">⚡ Ultimate Specials:</strong> Earn energy core power by landing punches and kicks. Once your special meter reaches <strong className="text-purple-400">100%</strong>, tap the special key to unleash your signature cinematic blow.</p>
                <p><strong className="text-yellow-400 uppercase">💥 Combo Chains:</strong> Landing multiple continuous attacks triggers combo multipliers. Try locking the AI in light punch setups, then cancel into a heavy kick wrap-up!</p>
              </div>
            </div>
          </div>
        )}

        <div className="text-[10px] text-gray-500 italic max-w-sm">
          Tips: Hold backward relative to the opponent to BLOCK attacks and prevent long stun loops!
        </div>
      </div>

      {/* 4. PRO COMBAT DOJO COACH ANALYSIS BOX */}
      <div className="mt-4 border border-purple-900/40 rounded-xl bg-purple-950/10 backdrop-blur-md overflow-hidden transition-all duration-350 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        <button
          onClick={() => { sfx.playChime(); setShowCoachPanel(!showCoachPanel); }}
          className="w-full flex justify-between items-center px-4 py-3 bg-[#0d0417] text-left text-xs font-black tracking-wider uppercase text-purple-300 hover:text-white transition-all font-mono border-b border-purple-950 select-none cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-cyan-400 animate-pulse" />
            Tactical Dojo Match Coach: {p1Char.name} vs {p2Char.name}
          </span>
          <span className="text-[10px] px-2.5 py-0.5 rounded bg-purple-900/40 text-purple-200">
            {showCoachPanel ? 'Collapse Tactical Guide' : 'Expand Tactical Guide'}
          </span>
        </button>

        {showCoachPanel && (
          <div className="p-4 bg-[#05010b]/92 min-h-[100px] leading-relaxed text-gray-300 text-xs">
            {isLoadingCoach ? (
              <div className="flex flex-col items-center justify-center gap-3 py-6">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[9px] tracking-widest uppercase text-purple-400 font-mono animate-pulse">Dojo Master calculating secret matchup strategies...</span>
              </div>
            ) : coachMarkdown ? (
              <div className="space-y-3 select-text leading-relaxed font-sans text-stone-300">
                {coachMarkdown.split('\n\n').map((para, pIdx) => {
                  if (para.startsWith('###') || para.startsWith('### ')) {
                    return (
                      <h4 key={pIdx} className="text-purple-400 font-black font-mono uppercase tracking-wider text-xs mb-1 mt-3 flex items-center gap-1">
                        ● {para.replace(/###\s*/, '').trim()}
                      </h4>
                    );
                  }
                  if (para.startsWith('1.') || para.startsWith('2.') || para.startsWith('3.')) {
                    return (
                      <div key={pIdx} className="pl-2 border-l-2 border-purple-950 py-0.5 font-mono text-[11px] text-purple-200 leading-relaxed">
                        {para}
                      </div>
                    );
                  }
                  
                  // Simple bold highlights parser
                  const parts = para.split('**');
                  if (parts.length > 1) {
                    return (
                      <p key={pIdx} className="leading-relaxed">
                        {parts.map((item, idx) => (
                          idx % 2 === 1 
                            ? <strong key={idx} className="text-yellow-400 bg-yellow-950/25 px-1 rounded font-mono font-bold">{item}</strong>
                            : item
                        ))}
                      </p>
                    );
                  }
                  
                  return <p key={pIdx} className="leading-relaxed">{para}</p>;
                })}
              </div>
            ) : (
              <div className="text-[10px] text-purple-500 italic font-mono uppercase tracking-wide text-center py-4">No advice loaded. Check server connection.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
