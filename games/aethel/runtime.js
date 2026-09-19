        class ConfettiParticle {
            constructor(x, y, color, speedMultiplier = 1) {
                this.pos = new Vector(x, y);
                const angle = Math.random() * Math.PI * 2;
                const speed = (2.2 + Math.random() * 4.2) * speedMultiplier;
                this.vel = new Vector(Math.cos(angle) * speed, Math.sin(angle) * speed - 1.5);
                this.life = 1;
                this.decay = 0.018 + Math.random() * 0.018;
                this.color = color;
                this.w = 2 + Math.random() * 4;
                this.h = 5 + Math.random() * 6;
                this.rotation = Math.random() * Math.PI;
                this.spin = (Math.random() - 0.5) * 0.45;
            }
            update() {
                this.pos.add(this.vel);
                this.vel.x *= 0.985;
                this.vel.y = this.vel.y * 0.985 + 0.08;
                this.rotation += this.spin;
                this.life -= this.decay;
            }
            draw(ctx) {
                ctx.save();
                ctx.globalAlpha = Math.max(0, this.life);
                ctx.translate(this.pos.x, this.pos.y);
                ctx.rotate(this.rotation);
                ctx.fillStyle = this.color;
                ctx.shadowBlur = 5;
                ctx.shadowColor = this.color;
                ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
                ctx.restore();
            }
        }

        class Particle {
            constructor(x, y, color, speedMultiplier = 1) {
                this.pos = new Vector(x, y);
                let angle = Math.random() * Math.PI * 2;
                let speed = Math.random() * 3 * speedMultiplier;
                this.vel = new Vector(Math.cos(angle)*speed, Math.sin(angle)*speed);
                this.life = 1.0;
                this.decay = 0.02 + Math.random() * 0.03;
                this.color = color;
                this.size = Math.random() * 3 + 1;
            }
            update() {
                this.pos.add(this.vel);
                this.vel.mult(0.95); // friction
                this.life -= this.decay;
            }
            draw(ctx) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = Math.max(0, this.life);
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI*2);
                ctx.fill();
                ctx.restore();
            }
        }

        function createParticle(x, y, color, speed=1) {
            particles.push(new Particle(x, y, color, speed));
        }

        function createConfetti(x, y, color, speed=1) {
            particles.push(new ConfettiParticle(x, y, color, speed));
        }

        // Background stars
        function initStars() {
            stars = [];
            for(let i=0; i<150; i++) {
                stars.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    size: Math.random() * 1.5,
                    alpha: Math.random(),
                    speed: (Math.random() * 0.5 + 0.1)
                });
            }
        }

        function drawBackground() {
            ctx.fillStyle = '#020205';
            ctx.fillRect(0, 0, width, height);

            ctx.save();
            ctx.fillStyle = 'white';
            stars.forEach(star => {
                star.y -= star.speed; // scroll up
                if(star.y < 0) {
                    star.y = height;
                    star.x = Math.random() * width;
                }
                // Twinkle
                let currentAlpha = star.alpha + Math.sin(Date.now()*0.003 * star.speed) * 0.3;
                ctx.globalAlpha = Math.max(0, Math.min(1, currentAlpha));
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI*2);
                ctx.fill();
            });
            ctx.restore();
        }

        function gainXp(amount) {
            gameState.xp += amount;
            gameState.score += amount * 10;
            
            if (gameState.xp >= gameState.xpNeeded) {
                gameState.xp -= gameState.xpNeeded;
                gameState.level++;
                gameState.xpNeeded = Math.floor(gameState.xpNeeded * 1.5);
                gameState.difficulty += 0.2; // Game gets harder!
                aethel.evolve();
                
                // Heal on level up
                aethel.health = aethel.maxHealth;
            }
        }

        function updateUI() {
            if(!aethel) return;

            let hpPercent = (aethel.health / aethel.maxHealth) * 100;
            barHealth.style.width = `${Math.max(0, hpPercent)}%`;
            healthText.innerText = `${Math.ceil(Math.max(0, hpPercent))}%`;
            
            if (hpPercent < 25) {
                barHealth.style.background = '#ef4444';
                barHealth.style.boxShadow = '0 0 10px #ef4444';
                healthText.classList.add('text-red-400');
                healthText.classList.remove('text-gray-300');
            } else {
                barHealth.style.background = '#10b981';
                barHealth.style.boxShadow = '0 0 10px #10b981';
                healthText.classList.remove('text-red-400');
                healthText.classList.add('text-gray-300');
            }

            let hungerPercent = (aethel.hunger / aethel.maxHunger) * 100;
            barHunger.style.width = `${Math.max(0, hungerPercent)}%`;
            hungerText.innerText = `${Math.ceil(Math.max(0, hungerPercent))}%`;

            let xpPercent = (gameState.xp / gameState.xpNeeded) * 100;
            barXp.style.width = `${Math.max(0, xpPercent)}%`;
            xpText.innerText = `${Math.ceil(Math.max(0, xpPercent))}%`;

            levelDisplay.innerText = gameState.level;
            scoreDisplay.innerText = Math.floor(gameState.score);
            formDisplay.innerText = getEvolutionName(gameState.level);
            abilityDisplay.innerText = getAbilitySummary(gameState.level);
            bestScoreDisplayHud.innerText = Math.floor(highScore);
            prismaticSignal.classList.toggle('hidden', !foods.some(f => f.isPrismatic));

            const setAbilityUI = (chip, stateEl, fillEl, unlocked, readyText, progress, mode='ready') => {
                chip.classList.remove('locked','ready','cooldown');
                if (!unlocked) {
                    chip.classList.add('locked');
                    fillEl.style.width = '0%';
                    stateEl.innerText = readyText;
                    return;
                }
                chip.classList.add(mode === 'cooldown' ? 'cooldown' : 'ready');
                fillEl.style.width = `${Math.round(clamp01(progress) * 100)}%`;
                stateEl.innerText = readyText;
            };

            setAbilityUI(
                abilityDash,
                abilityDashState,
                abilityDashFill,
                hasAbility('dash'),
                hasAbility('dash') ? (aethel.dashCooldown > 0 ? `COOLDOWN · ${formatCooldown(aethel.dashCooldown)}` : 'READY · TAP SPACE') : 'LOCKED · LV2',
                hasAbility('dash') ? (aethel.dashCooldown > 0 ? 1 - aethel.dashCooldown / ABILITY_COOLDOWNS.dash : 1) : 0,
                hasAbility('dash') && aethel.dashCooldown > 0 ? 'cooldown' : 'ready'
            );

            setAbilityUI(
                abilityShield,
                abilityShieldState,
                abilityShieldFill,
                hasAbility('shield'),
                hasAbility('shield') ? (aethel.shieldReady ? 'READY · AUTO BLOCK' : `RECHARGE · ${formatCooldown(aethel.shieldCooldown)}`) : 'LOCKED · LV4',
                hasAbility('shield') ? (aethel.shieldReady ? 1 : 1 - aethel.shieldCooldown / ABILITY_COOLDOWNS.shield) : 0,
                hasAbility('shield') && !aethel.shieldReady ? 'cooldown' : 'ready'
            );

            setAbilityUI(
                abilityMagnet,
                abilityMagnetState,
                abilityMagnetFill,
                hasAbility('magnet'),
                hasAbility('magnet') ? 'ACTIVE · FOOD PULL' : 'LOCKED · LV6',
                hasAbility('magnet') ? 1 : 0,
                'ready'
            );

            setAbilityUI(
                abilityPulse,
                abilityPulseState,
                abilityPulseFill,
                hasAbility('pulse'),
                hasAbility('pulse') ? (aethel.pulseCooldown > 0 ? `CHARGING · ${formatCooldown(aethel.pulseCooldown)}` : 'READY · DOUBLE TAP') : 'LOCKED · LV8',
                hasAbility('pulse') ? (aethel.pulseCooldown > 0 ? 1 - aethel.pulseCooldown / ABILITY_COOLDOWNS.pulse : 1) : 0,
                hasAbility('pulse') && aethel.pulseCooldown > 0 ? 'cooldown' : 'ready'
            );
        }

        function handleInteraction(e) {
            if(!gameState.isRunning) return;
            
            // Pointer for movement
            const rect = canvas.getBoundingClientRect();
            // Handle both touch and mouse events natively
            let clientX = e.touches ? e.touches[0].clientX : e.clientX;
            let clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            pointer.x = clientX - rect.left;
            pointer.y = clientY - rect.top;
            pointer.active = true;

            // Attack logic on tap/click
            if(e.type === 'pointerdown' || e.type === 'touchstart') {
                if(!isAudioEnabled && audioCtx === undefined) initAudio(); // Auto-start audio context on tap
                
                // Visual click ring
                clickEffects.push({x: pointer.x, y: pointer.y, radius: 0, life: 1});

                // Check intersection with enemies
                let hitEnemy = false;
                for(let i = enemies.length-1; i >= 0; i--) {
                    let enemy = enemies[i];
                    let dist = new Vector(pointer.x, pointer.y).dist(enemy.pos);
                    // Generous hit box for mobile
                    if (dist < enemy.radius * 4) { // Increased hitbox for better feel
                        // Kill enemy
                        for(let j=0; j<15; j++) createParticle(enemy.pos.x, enemy.pos.y, '#ef4444');
                        enemies.splice(i, 1);
                        gameState.score += 50;
                        hitEnemy = true;
                    }
                }
                
                if(hitEnemy) {
                    playSound('hit', 80, 0.3);
                    shakeTime = 8;
                } else {
                    const now = performance.now();
                    const isDoubleTap = now - lastTapTime < 280;
                    lastTapTime = now;
                    let usedAbility = false;
                    if (aethel && isDoubleTap) usedAbility = aethel.activatePulse();
                    if (aethel && !usedAbility) usedAbility = aethel.triggerDash(pointer.x, pointer.y);
                    playSound(usedAbility ? 'evolve' : 'eat', usedAbility ? 620 : 800, usedAbility ? 0.08 : 0.05);
                }
            }
        }

        function releasePointer() {
            // pointer.active = false; // We let Aethel follow last known position to keep flow smooth
        }

        function setupInputs() {
            canvas.addEventListener('pointerdown', handleInteraction);
            canvas.addEventListener('pointermove', (e) => {
                if(e.buttons > 0) handleInteraction(e);
                else {
                    const rect = canvas.getBoundingClientRect();
                    pointer.x = e.clientX - rect.left;
                    pointer.y = e.clientY - rect.top;
                    pointer.active = true;
                }
            });
            window.addEventListener('pointerup', releasePointer);
            
            // Pointer Events handle both mouse and touch. CSS touch-action:none prevents page gestures.
            canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        }

        function spawnLogic(dt) {
            // Spawn Food
            gameState.foodTimer -= dt;
            if (gameState.foodTimer <= 0) {
                if(foods.length < 5) foods.push(new Food());
                gameState.foodTimer = 2.0 + Math.random() * 2.0; // 2-4 seconds
            }

            // Spawn Enemies (rate scales with difficulty)
            gameState.enemyTimer -= dt;
            if (gameState.enemyTimer <= 0) {
                let maxEnemies = Math.floor(2 + gameState.difficulty);
                if(enemies.length < maxEnemies) enemies.push(new Enemy());
                
                let baseSpawnRate = 5.0;
                let actualSpawnRate = Math.max(0.5, baseSpawnRate - gameState.difficulty);
                gameState.enemyTimer = actualSpawnRate + Math.random() * 2.0;
            }
        }

        function gameLoop(timestamp) {
            if(!lastTime) lastTime = timestamp;
            // Delta time in seconds, capped to prevent huge jumps if tab is inactive
            let dt = Math.min((timestamp - lastTime) / 1000, 0.1); 
            lastTime = timestamp;

            if (gameState.isRunning) {
                // Update Logic
                aethel.update(dt);
                
                foods.forEach(f => f.update(dt));
                foods = foods.filter(f => f.life > 0);

                enemies.forEach(e => e.update(dt));
                enemies = enemies.filter(e => e.life > 0);

                particles.forEach(p => p.update(dt));
                particles = particles.filter(p => p.life > 0);

                clickEffects.forEach(c => { c.radius += 2; c.life -= 0.05; });
                clickEffects = clickEffects.filter(c => c.life > 0);

                spawnLogic(dt);
                updateUI();
                
                gameState.score += dt; // passive score
            }

            // Drawing
            ctx.save();
            
            // Camera Shake application
            if (shakeTime > 0) {
                ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
                shakeTime--;
            }

            drawBackground();

            foods.forEach(f => f.draw(ctx));
            
            if(gameState.isRunning || aethel) {
                aethel.draw(ctx);
            }
            
            enemies.forEach(e => e.draw(ctx));
            particles.forEach(p => p.draw(ctx));

            // Draw click effects
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 242, 254, 0.5)';
            ctx.lineWidth = 2;
            clickEffects.forEach(c => {
                ctx.globalAlpha = Math.max(0, c.life);
                ctx.beginPath();
                ctx.arc(c.x, c.y, c.radius, 0, Math.PI*2);
                ctx.stroke();
            });
            ctx.restore(); // Restore click styles
            
            ctx.restore(); // Restore camera translation

            animationFrameId = requestAnimationFrame(gameLoop);
        }

        function resizeCanvas() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            initStars();
        }

        function startGame() {
            document.getElementById('start-screen').classList.remove('active');
            
            // Reset state
            gameState = {
                isRunning: true,
                score: 0,
                level: 1,
                xp: 0,
                xpNeeded: 100,
                foodTimer: 1.0,
                enemyTimer: 5.0,
                difficulty: 1.0
            };
            
            aethel = new Aethel(width/2, height/2);
            foods = [];
            enemies = [];
            particles = [];
            pointer.active = false;
            formDisplay.innerText = getEvolutionName(1);
            abilityDisplay.innerText = getAbilitySummary(1);
            prismaticSignal.classList.add('hidden');
            bestScoreDisplayHud.innerText = Math.floor(highScore);
        }

        function gameOver() {
            gameState.isRunning = false;
            
            playSound('hit', 50, 1.0); // Heavy death sound
            shakeTime = 25; // Massive shake
            
            if (gameState.score > highScore) {
                highScore = gameState.score;
                localStorage.setItem('forge_aethel_highscore', String(Math.floor(highScore)));
            }
            
            // Death explosion
            for(let i=0; i<100; i++) {
                createParticle(aethel.pos.x, aethel.pos.y, 'white', 5);
                createParticle(aethel.pos.x, aethel.pos.y, `hsl(${aethel.hue}, 100%, 50%)`, 4);
            }
            aethel = null;
            
            document.getElementById('final-score').innerText = Math.floor(gameState.score);
            document.getElementById('high-score-display').innerText = Math.floor(highScore);
            document.getElementById('final-level').innerText = gameState.level;
            document.getElementById('final-form').innerText = getEvolutionName(gameState.level);
            bestScoreDisplayHud.innerText = Math.floor(highScore);
            
            setTimeout(() => {
                document.getElementById('game-over-screen').classList.add('active');
            }, 1000);
        }

        function restartGame() {
            document.getElementById('game-over-screen').classList.remove('active');
            startGame();
        }

        function init() {
            window.addEventListener('resize', resizeCanvas);
            resizeCanvas();
            setupInputs();
            bestScoreDisplayHud.innerText = Math.floor(highScore);
            formDisplay.innerText = getEvolutionName(1);
            abilityDisplay.innerText = getAbilitySummary(1);
            prismaticSignal.classList.add('hidden');
            updateCinematicButton();
            
            animationFrameId = requestAnimationFrame(gameLoop);
        }

        // Boot
        window.onload = init;
    