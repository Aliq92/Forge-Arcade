
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d', { alpha: false }); // Optimize
        
        // UI Elements
        const barHealth = document.getElementById('bar-health');
        const barHunger = document.getElementById('bar-hunger');
        const barXp = document.getElementById('bar-xp');
        const healthText = document.getElementById('health-text');
        const hungerText = document.getElementById('hunger-text');
        const xpText = document.getElementById('xp-text');
        const levelDisplay = document.getElementById('level-display');
        const scoreDisplay = document.getElementById('score-display');
        const formDisplay = document.getElementById('form-display');
        const abilityDisplay = document.getElementById('ability-display');
        const bestScoreDisplayHud = document.getElementById('best-score-display-hud');
        const prismaticSignal = document.getElementById('prismatic-signal');
        const evoText = document.getElementById('evo-text');
        const audioBtn = document.getElementById('audio-toggle');
        const iconMuted = document.getElementById('icon-muted');
        const iconUnmuted = document.getElementById('icon-unmuted');
        const abilityDash = document.getElementById('ability-dash');
        const abilityShield = document.getElementById('ability-shield');
        const abilityMagnet = document.getElementById('ability-magnet');
        const abilityPulse = document.getElementById('ability-pulse');
        const abilityDashState = document.getElementById('ability-dash-state');
        const abilityShieldState = document.getElementById('ability-shield-state');
        const abilityMagnetState = document.getElementById('ability-magnet-state');
        const abilityPulseState = document.getElementById('ability-pulse-state');
        const abilityDashFill = document.getElementById('ability-dash-fill');
        const abilityShieldFill = document.getElementById('ability-shield-fill');
        const abilityMagnetFill = document.getElementById('ability-magnet-fill');
        const abilityPulseFill = document.getElementById('ability-pulse-fill');
        
        let width, height;
        let animationFrameId;
        let lastTime = 0;
        let highScore = Number(localStorage.getItem('forge_aethel_highscore') || 0);
        let shakeTime = 0;
        let lastTapTime = 0;
        
        // --- Generative Audio System ---
        let audioCtx;
        let isAudioEnabled = false;

        function initAudio() {
            if (!audioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                audioCtx = new AudioContext();
            }
            if (audioCtx.state === 'suspended') audioCtx.resume();
            isAudioEnabled = true;
            iconMuted.classList.add('hidden');
            iconUnmuted.classList.remove('hidden');
        }

        audioBtn.addEventListener('click', () => {
            if (isAudioEnabled) {
                isAudioEnabled = false;
                iconMuted.classList.remove('hidden');
                iconUnmuted.classList.add('hidden');
            } else {
                initAudio();
            }
        });

        function playSound(type, pitch = 400, duration = 0.1) {
            if (!isAudioEnabled || !audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            if (type === 'eat') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(pitch, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, audioCtx.currentTime + duration);
                gain.gain.setValueAtTime(0, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
            } else if (type === 'hit') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(150, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + duration);
                gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
            } else if (type === 'evolve') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(300, audioCtx.currentTime);
                osc.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + duration);
                gain.gain.setValueAtTime(0, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + duration/2);
                gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + duration);
            }
            
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        }

        // Input tracking
        const pointer = { x: 0, y: 0, active: false };
        let clickEffects = [];

        // Game Entities
        let aethel;
        let foods = [];
        let enemies = [];
        let particles = [];
        let stars = [];

        // Game State
        let gameState = {
            isRunning: false,
            score: 0,
            level: 1,
            xp: 0,
            xpNeeded: 100,
            foodTimer: 0,
            enemyTimer: 0,
            difficulty: 1.0
        };

        // Named creature forms shown at every evolution. Level 1 remains Aethel.
        const evolutionNames = [
            'AETHEL',
            'LUMENVEIL',
            'STARWEAVER',
            'MOONCREST',
            'ASTRALYN',
            'SOLVYR',
            'AETHERION',
            'NYXARA',
            'CELESTARA',
            'EMPYREON',
            'SERAPHIS',
            'ETERNALIS'
        ];

        function getEvolutionName(level) {
            if (level <= evolutionNames.length) return evolutionNames[level - 1];
            return `ETERNALIS ASCENDANT ${level - evolutionNames.length}`;
        }

        const ABILITY_UNLOCK_LEVELS = { dash: 2, shield: 4, magnet: 6, pulse: 8 };
        const ABILITY_COOLDOWNS = { dash: 1.9, shield: 12, pulse: 9 };

        function clamp01(v) { return Math.max(0, Math.min(1, v)); }
        function hasAbility(name, level = gameState.level) {
            return level >= ABILITY_UNLOCK_LEVELS[name];
        }
        function formatCooldown(value) {
            return `${Math.max(0.1, value).toFixed(1)}s`;
        }
        function getAbilitySummary(level = gameState.level) {
            const labels = ['CORE'];
            if (hasAbility('dash', level)) labels.push('DASH');
            if (hasAbility('shield', level)) labels.push('AEGIS');
            if (hasAbility('magnet', level)) labels.push('MAGNET');
            if (hasAbility('pulse', level)) labels.push('PULSE');
            return labels.join(' // ');
        }

        // Vector Math Utility
        class Vector {
            constructor(x, y) { this.x = x; this.y = y; }
            add(v) { this.x += v.x; this.y += v.y; return this; }
            sub(v) { this.x -= v.x; this.y -= v.y; return this; }
            mult(n) { this.x *= n; this.y *= n; return this; }
            mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
            normalize() { let m = this.mag(); if(m!==0) this.mult(1/m); return this; }
            dist(v) { let dx = this.x - v.x; let dy = this.y - v.y; return Math.sqrt(dx*dx + dy*dy); }
            copy() { return new Vector(this.x, this.y); }
        }

        class Aethel {
            constructor(x, y) {
                this.pos = new Vector(x, y);
                this.vel = new Vector(0, 0);
                this.acc = new Vector(0, 0);
                
                // Stats
                this.maxHealth = 100;
                this.health = 100;
                this.maxHunger = 100;
                this.hunger = 100;
                this.speed = 3.5;
                this.turnSpeed = 0.08;
                
                // Procedural Body (IK Trail)
                this.segments = [];
                this.numSegments = 12;
                this.segmentLength = 10;
                
                for(let i=0; i<this.numSegments; i++) {
                    this.segments.push(new Vector(x, y + i * this.segmentLength));
                }

                // Aesthetics
                this.hue = 200;
                this.pulsePhase = 0;
                this.tattooCount = 1;

                // Evolution abilities
                this.dashCooldown = 0;
                this.dashTimer = 0;
                this.dashVector = new Vector(0, 0);
                this.shieldCooldown = 0;
                this.shieldReady = false;
                this.pulseCooldown = 0;
                this.pulseWave = 0;
                this.pulseWaveRadius = 0;
                this.prismaticBoost = 0;
            }

            evolve() {
                const lastSeg = this.segments[this.segments.length-1];
                for(let i=0; i<3; i++) {
                    this.segments.push(new Vector(lastSeg.x, lastSeg.y));
                }
                this.numSegments = this.segments.length;
                this.segmentLength += 1;
                
                this.maxHealth += 20;
                this.health = this.maxHealth;
                this.maxHunger += 10;
                this.hunger = this.maxHunger;
                this.speed += 0.5;
                
                this.hue = (this.hue + 40) % 360;
                this.tattooCount = Math.max(this.tattooCount + 1, gameState.level);

                if (hasAbility('shield') && !this.shieldReady && this.shieldCooldown <= 0) this.shieldReady = true;
                if (hasAbility('pulse') && this.pulseCooldown > ABILITY_COOLDOWNS.pulse) this.pulseCooldown = ABILITY_COOLDOWNS.pulse;
                
                playSound('evolve', 300, 1.5);
                shakeTime = 15;
                
                for(let i=0; i<50; i++) {
                    createParticle(this.pos.x, this.pos.y, `hsl(${this.hue}, 100%, 70%)`, 3);
                }
                
                evoText.textContent = getEvolutionName(gameState.level);
                evoText.classList.add('show');
                setTimeout(() => evoText.classList.remove('show'), 3000);
            }

            triggerDash(targetX, targetY) {
                if (!hasAbility('dash') || this.dashCooldown > 0) return false;
                const dir = new Vector(targetX, targetY).sub(this.pos);
                if (dir.mag() < 5) return false;
                dir.normalize();
                this.dashVector = dir;
                this.dashTimer = 0.18;
                this.dashCooldown = ABILITY_COOLDOWNS.dash;
                for (let i = 0; i < 12; i++) {
                    createParticle(this.pos.x, this.pos.y, `hsla(${this.hue}, 100%, 75%, 0.95)`, 1.3);
                }
                return true;
            }

            tryBlockWithShield(enemy) {
                if (!hasAbility('shield') || !this.shieldReady) return false;
                this.shieldReady = false;
                this.shieldCooldown = ABILITY_COOLDOWNS.shield;
                enemy.life = 0;
                shakeTime = 6;
                playSound('evolve', 260, 0.4);
                for (let i = 0; i < 26; i++) {
                    createParticle(enemy.pos.x, enemy.pos.y, '#56f5ff', 1.8);
                }
                return true;
            }

            activatePulse() {
                if (!hasAbility('pulse') || this.pulseCooldown > 0) return false;
                this.pulseCooldown = ABILITY_COOLDOWNS.pulse;
                this.pulseWave = 0.48;
                this.pulseWaveRadius = 0;
                shakeTime = 10;
                playSound('evolve', 420, 0.55);

                let cleared = 0;
                enemies.forEach(enemy => {
                    if (enemy.life <= 0) return;
                    const dist = this.pos.dist(enemy.pos);
                    if (dist < 160) {
                        enemy.life = 0;
                        cleared++;
                        for (let i = 0; i < 14; i++) createParticle(enemy.pos.x, enemy.pos.y, '#a86cff', 1.4);
                    }
                });
                if (cleared > 0) gameState.score += cleared * 40;
                return true;
            }

            applyPrismaticBlessing() {
                this.prismaticBoost = 4.5;
                this.hunger = this.maxHunger;
                this.health = Math.min(this.maxHealth, this.health + 18);
                this.dashCooldown = 0;
                if (hasAbility('shield')) { this.shieldCooldown = 0; this.shieldReady = true; }
                if (hasAbility('pulse')) this.pulseCooldown = Math.max(0, this.pulseCooldown - 3);
            }

            update(dt) {
                this.pulsePhase += 0.05;
                this.dashCooldown = Math.max(0, this.dashCooldown - dt);
                if (this.dashTimer > 0) this.dashTimer = Math.max(0, this.dashTimer - dt);
                if (hasAbility('shield')) {
                    if (!this.shieldReady) {
                        this.shieldCooldown = Math.max(0, this.shieldCooldown - dt);
                        if (this.shieldCooldown <= 0) this.shieldReady = true;
                    }
                } else {
                    this.shieldReady = false;
                }
                if (hasAbility('pulse')) this.pulseCooldown = Math.max(0, this.pulseCooldown - dt);
                if (this.pulseWave > 0) {
                    this.pulseWave -= dt;
                    this.pulseWaveRadius += 560 * dt;
                }
                if (this.prismaticBoost > 0) this.prismaticBoost = Math.max(0, this.prismaticBoost - dt);

                // Movement logic
                if (pointer.active) {
                    let desired = new Vector(pointer.x, pointer.y).sub(this.pos);
                    let dist = desired.mag();
                    
                    if (dist > 10) {
                        const dashBoost = this.dashTimer > 0 ? 2.35 : 1;
                        desired.normalize().mult(this.speed * dashBoost);
                        let steer = desired.sub(this.vel);
                        steer.mult(this.turnSpeed * (this.dashTimer > 0 ? 1.25 : 1));
                        this.vel.add(steer);
                    } else {
                        this.vel.mult(this.dashTimer > 0 ? 0.94 : 0.9);
                    }
                } else {
                    this.vel.mult(0.98); 
                }

                if (this.dashTimer > 0) {
                    this.vel.add(this.dashVector.copy().mult(0.55));
                }

                const maxSpeed = this.speed * (this.dashTimer > 0 ? 2.9 : 1.4);
                if (this.vel.mag() > maxSpeed) this.vel.normalize().mult(maxSpeed);
                this.pos.add(this.vel);

                if (this.pos.x < 0) this.pos.x = width;
                if (this.pos.x > width) this.pos.x = 0;
                if (this.pos.y < 0) this.pos.y = height;
                if (this.pos.y > height) this.pos.y = 0;

                this.segments[0].x = this.pos.x;
                this.segments[0].y = this.pos.y;
                
                for (let i = 1; i < this.numSegments; i++) {
                    let dx = this.segments[i-1].x - this.segments[i].x;
                    let dy = this.segments[i-1].y - this.segments[i].y;
                    let angle = Math.atan2(dy, dx);
                    
                    this.segments[i].x = this.segments[i-1].x - Math.cos(angle) * this.segmentLength;
                    this.segments[i].y = this.segments[i-1].y - Math.sin(angle) * this.segmentLength;
                }

                // Passive magnet pull
                if (hasAbility('magnet')) {
                    foods.forEach(food => {
                        if (food.life <= 0) return;
                        const dx = this.pos.x - food.pos.x;
                        const dy = this.pos.y - food.pos.y;
                        const dist = Math.hypot(dx, dy) || 1;
                        if (dist < 180) {
                            const pull = (1 - dist / 180) * (food.isPrismatic ? 1.0 : 0.75);
                            food.pos.x += (dx / dist) * pull * 120 * dt;
                            food.pos.y += (dy / dist) * pull * 120 * dt;
                        }
                    });
                }

                // Stats
                this.hunger -= 1.5 * dt;
                
                if (this.hunger <= 0) {
                    this.hunger = 0;
                    this.health -= 5 * dt;
                    if (Math.random() < 0.1) shakeTime = 5;
                } else if (this.hunger > 50 && this.health < this.maxHealth) {
                    this.health += 2 * dt;
                }

                if (this.health <= 0) gameOver();
            }

            draw(ctx) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                
                let glowHue = this.prismaticBoost > 0 ? (Date.now() * 0.08) % 360 : this.hue;
                let glowColor = `hsl(${glowHue}, 100%, 70%)`;
                
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                for(let pass=0; pass<2; pass++) {
                    ctx.beginPath();
                    ctx.moveTo(this.segments[0].x, this.segments[0].y);
                    
                    for (let i = 1; i < this.numSegments; i++) {
                        let wiggle = Math.sin(this.pulsePhase - i*0.5) * (i*0.5);
                        let perpX = -this.vel.y;
                        let perpY = this.vel.x;
                        let perpMag = Math.sqrt(perpX*perpX + perpY*perpY) || 1;
                        perpX = (perpX/perpMag) * wiggle;
                        perpY = (perpY/perpMag) * wiggle;

                        ctx.lineTo(this.segments[i].x + perpX, this.segments[i].y + perpY);
                    }
                    
                    if(pass === 0) {
                        ctx.lineWidth = 15;
                        ctx.strokeStyle = `hsla(${glowHue}, 80%, 30%, 0.3)`;
                        ctx.shadowBlur = 20;
                        ctx.shadowColor = glowColor;
                    } else {
                        ctx.lineWidth = 6;
                        ctx.strokeStyle = 'white';
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = glowColor;
                    }
                    ctx.stroke();
                }

                const tattooCount = Math.min(this.tattooCount, Math.max(1, this.numSegments - 2));
                for (let t = 0; t < tattooCount; t++) {
                    const usable = Math.max(2, this.numSegments - 3);
                    const segIndex = Math.min(this.numSegments - 2, 2 + Math.floor((t / Math.max(1, tattooCount - 1)) * usable));
                    const seg = this.segments[segIndex];
                    const prev = this.segments[Math.max(0, segIndex - 1)];
                    const next = this.segments[Math.min(this.numSegments - 1, segIndex + 1)];
                    const dx = next.x - prev.x;
                    const dy = next.y - prev.y;
                    const mag = Math.hypot(dx, dy) || 1;
                    const nx = -dy / mag;
                    const ny = dx / mag;
                    const tx = dx / mag;
                    const ty = dy / mag;
                    const half = 7 + (t % 3) * 1.5;
                    const offset = ((t % 2) ? 1 : -1) * 1.5;
                    const cx = seg.x + nx * offset;
                    const cy = seg.y + ny * offset;

                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.strokeStyle = `hsla(${(glowHue + 150 + t * 29) % 360}, 100%, 78%, 0.95)`;
                    ctx.shadowColor = ctx.strokeStyle;
                    ctx.shadowBlur = 10;
                    ctx.lineWidth = 1.6;
                    ctx.lineCap = 'round';

                    const style = t % 4;
                    if (style === 0) {
                        ctx.beginPath();
                        ctx.moveTo(cx - nx * half, cy - ny * half);
                        ctx.lineTo(cx + nx * half, cy + ny * half);
                        ctx.stroke();
                    } else if (style === 1) {
                        for (const shift of [-2.5, 2.5]) {
                            ctx.beginPath();
                            ctx.moveTo(cx + tx * shift - nx * half, cy + ty * shift - ny * half);
                            ctx.lineTo(cx + tx * shift + nx * half, cy + ty * shift + ny * half);
                            ctx.stroke();
                        }
                    } else if (style === 2) {
                        ctx.beginPath();
                        ctx.moveTo(cx - nx * half, cy - ny * half);
                        ctx.lineTo(cx + tx * 3, cy + ty * 3);
                        ctx.lineTo(cx + nx * half, cy + ny * half);
                        ctx.stroke();
                    } else {
                        ctx.beginPath();
                        ctx.moveTo(cx - nx * half, cy - ny * half);
                        ctx.lineTo(cx, cy);
                        ctx.lineTo(cx + nx * half, cy + ny * half);
                        ctx.moveTo(cx - tx * 4, cy - ty * 4);
                        ctx.lineTo(cx + tx * 4, cy + ty * 4);
                        ctx.stroke();
                    }
                    ctx.restore();
                }

                // Shield ring when ready
                if (hasAbility('shield') && this.shieldReady) {
                    ctx.beginPath();
                    ctx.arc(this.pos.x, this.pos.y, 21 + Math.sin(this.pulsePhase * 1.8) * 2, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(86,245,255,0.8)';
                    ctx.lineWidth = 2;
                    ctx.shadowBlur = 14;
                    ctx.shadowColor = '#56f5ff';
                    ctx.stroke();
                }

                if (this.pulseWave > 0) {
                    ctx.beginPath();
                    ctx.arc(this.pos.x, this.pos.y, this.pulseWaveRadius, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(168,108,255,${Math.min(0.6, this.pulseWave * 1.3)})`;
                    ctx.lineWidth = 4;
                    ctx.shadowBlur = 18;
                    ctx.shadowColor = '#a86cff';
                    ctx.stroke();
                }

                let coreRadius = 12 + Math.sin(this.pulsePhase)*2;
                
                ctx.beginPath();
                ctx.moveTo(this.pos.x, this.pos.y);
                ctx.quadraticCurveTo(
                    this.pos.x - this.vel.y * 5, 
                    this.pos.y + this.vel.x * 5, 
                    this.pos.x - this.vel.x * 3 - this.vel.y * 6, 
                    this.pos.y - this.vel.y * 3 + this.vel.x * 6
                );
                ctx.moveTo(this.pos.x, this.pos.y);
                ctx.quadraticCurveTo(
                    this.pos.x + this.vel.y * 5, 
                    this.pos.y - this.vel.x * 5, 
                    this.pos.x - this.vel.x * 3 + this.vel.y * 6, 
                    this.pos.y - this.vel.y * 3 - this.vel.x * 6
                );
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = glowColor;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(this.pos.x, this.pos.y, coreRadius, 0, Math.PI * 2);
                ctx.fillStyle = 'white';
                ctx.shadowBlur = 30;
                ctx.shadowColor = glowColor;
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(this.pos.x, this.pos.y, coreRadius/2, 0, Math.PI * 2);
                ctx.fillStyle = `hsl(${glowHue}, 80%, 20%)`;
                ctx.shadowBlur = 0;
                ctx.fill();

                ctx.restore();
            }
        }

        class Food {
            constructor() {
                this.pos = new Vector(Math.random() * width, Math.random() * height);
                this.life = 1.0;
                const foodPalette = [42, 58, 115, 178, 205, 270, 320, 8];
                this.isPrismatic = Math.random() < 0.055;
                this.hue = foodPalette[Math.floor(Math.random() * foodPalette.length)];
                this.pulse = Math.random() * Math.PI;
                this.radius = this.isPrismatic ? 9 : 5;
            }
            update(dt) {
                this.pulse += this.isPrismatic ? 0.16 : 0.1;
                this.life -= (this.isPrismatic ? 0.012 : 0.02) * dt;
                
                if (aethel && this.pos.dist(aethel.pos) < (this.isPrismatic ? 34 : 30)) {
                    this.life = 0;
                    if (this.isPrismatic) {
                        aethel.applyPrismaticBlessing();
                        gainXp(65);
                        gameState.score += 250;
                        playSound('evolve', 500, 0.4);
                        const confettiPalette = ['#ffd166', '#06d6a0', '#00d9ff', '#a78bfa', '#ff4d8d', '#ff7849', '#f8f9fa'];
                        for (let i = 0; i < 62; i++) {
                            createConfetti(this.pos.x, this.pos.y, confettiPalette[Math.floor(Math.random() * confettiPalette.length)], 2.2 + Math.random() * 2.2);
                        }
                        for (let i = 0; i < 22; i++) {
                            createParticle(this.pos.x, this.pos.y, `hsl(${Math.random() * 360},100%,70%)`, 2.4);
                        }
                        shakeTime = Math.max(shakeTime, 12);
                    } else {
                        aethel.hunger = Math.min(aethel.maxHunger, aethel.hunger + 25);
                        gainXp(15);
                        playSound('eat', 400 + Math.random()*200, 0.15);
                        const confettiPalette = ['#ffd166', '#06d6a0', '#00d9ff', '#a78bfa', '#ff4d8d', '#ff7849', '#f8f9fa'];
                        for (let i = 0; i < 26; i++) {
                            createConfetti(this.pos.x, this.pos.y, confettiPalette[Math.floor(Math.random() * confettiPalette.length)], 1.4 + Math.random() * 1.8);
                        }
                        for (let i = 0; i < 5; i++) {
                            createParticle(this.pos.x, this.pos.y, 'white', 1.8);
                        }
                    }
                }
            }
            draw(ctx) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                const hue = this.isPrismatic ? ((Date.now() * 0.12) + this.pulse * 120) % 360 : this.hue;
                let r = this.radius + Math.sin(this.pulse) * (this.isPrismatic ? 2.6 : 2);
                let alpha = Math.max(0, this.life);

                if (this.isPrismatic) {
                    ctx.beginPath();
                    ctx.arc(this.pos.x, this.pos.y, r + 4, 0, Math.PI*2);
                    ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${alpha})`;
                    ctx.lineWidth = 2.5;
                    ctx.shadowBlur = 14;
                    ctx.shadowColor = `hsl(${hue},100%,60%)`;
                    ctx.stroke();
                }
                
                ctx.beginPath();
                ctx.arc(this.pos.x, this.pos.y, r, 0, Math.PI*2);
                ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${alpha})`;
                ctx.shadowBlur = this.isPrismatic ? 22 : 15;
                ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(this.pos.x, this.pos.y, r/2, 0, Math.PI*2);
                ctx.fillStyle = 'white';
                ctx.fill();
                
                ctx.restore();
            }
        }

        class Enemy {
            constructor() {
                // Spawn on edges
                let edge = Math.floor(Math.random() * 4);
                let x, y;
                if(edge === 0) { x = Math.random()*width; y = -50; }
                else if(edge === 1) { x = width+50; y = Math.random()*height; }
                else if(edge === 2) { x = Math.random()*width; y = height+50; }
                else { x = -50; y = Math.random()*height; }
                
                this.pos = new Vector(x, y);
                this.vel = new Vector(0,0);
                this.speed = 2 + (Math.random() * 1.5 * gameState.difficulty);
                this.radius = 12;
                this.latched = false;
                this.life = 1;
                this.stunTime = 0;
                this.wobble = Math.random() * Math.PI * 2;
            }

            update(dt) {
                if(!aethel) return;

                if (this.stunTime > 0) {
                    this.stunTime -= dt;
                    this.pos.add(this.vel);
                    this.vel.mult(0.96);
                } else if (!this.latched) {
                    // Hunt Aethel
                    let desired = new Vector(aethel.pos.x, aethel.pos.y).sub(this.pos);
                    let dist = desired.mag();
                    
                    desired.normalize().mult(this.speed);
                    
                    // Add erratic wobble
                    this.wobble += 0.2;
                    let perp = new Vector(-desired.y, desired.x).normalize().mult(Math.sin(this.wobble)*2);
                    desired.add(perp);

                    let steer = desired.sub(this.vel);
                    steer.mult(0.1); // turn speed
                    this.vel.add(steer);
                    this.pos.add(this.vel);

                    // Check Latch
                    if (dist < 20) {
                        if (aethel.tryBlockWithShield(this)) {
                            return;
                        }
                        this.latched = true;
                        createParticle(this.pos.x, this.pos.y, '#ef4444', 2);
                        shakeTime = 12;
                        playSound('hit', 100, 0.2);
                    }
                } else {
                    // Stick to Aethel and drain health
                    this.pos = aethel.pos.copy();
                    // Jitter
                    this.pos.x += (Math.random()-0.5)*10;
                    this.pos.y += (Math.random()-0.5)*10;
                    
                    aethel.health -= 15 * dt; // Heavy damage!
                    if (Math.random() < 0.2) shakeTime = 5;
                }
                
                // Dark chaotic trail particles
                if (Math.random() < 0.3) {
                    createParticle(this.pos.x + (Math.random()-0.5)*10, this.pos.y + (Math.random()-0.5)*10, '#333333', 0.5);
                }
            }

            draw(ctx) {
                ctx.save();
                
                // Dark chaotic shape
                ctx.translate(this.pos.x, this.pos.y);
                ctx.rotate(this.wobble);
                
                ctx.beginPath();
                for(let i=0; i<6; i++) {
                    let angle = (i/6) * Math.PI * 2;
                    let r = this.radius + (Math.random() * 4 - 2);
                    let px = Math.cos(angle) * r;
                    let py = Math.sin(angle) * r;
                    if(i===0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                
                ctx.fillStyle = '#0a0a0a';
                ctx.strokeStyle = '#ef4444'; // Red outline
                ctx.lineWidth = 2;
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ef4444';
                
                ctx.fill();
                ctx.stroke();

                // Red eye
                ctx.beginPath();
                ctx.arc(0, 0, 3, 0, Math.PI*2);
                ctx.fillStyle = '#ff0000';
                ctx.fill();

                ctx.restore();
            }
        }

