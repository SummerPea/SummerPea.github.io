(function () {
    'use strict';

    window.setupSprintAndSparkleDemo = function setupSprintAndSparkleDemo(demo) {
        const canvas = demo.querySelector('#game-canvas');
        const context = canvas?.getContext('2d');
        const startButton = demo.querySelector('#game-start');
        const status = demo.querySelector('#game-status');
        if (!canvas || !context || !startButton || !status) return;

        const width = canvas.width;
        const height = canvas.height;
        const wallHeight = 30;
        const worldSpeed = 92;
        const playerSpeed = 230;
        const cannonShootInterval = 1.15;
        const cannonRotationSpeed = 2.8;
        const bulletSpeed = 210;
        const cannonBarrelLength = 24;
        const keyboardInput = { left: false, right: false, up: false, down: false };
        const touchInput = { left: false, right: false, up: false, down: false };
        let player;
        let cannons;
        let bullets;
        let survivalTime;
        let backgroundDistance;
        let cannonTimer;
        let running = false;
        let frameId = null;
        let lastTime = 0;

        const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
        const positiveModulo = (value, period) => ((value % period) + period) % period;

        function clearInput(input) {
            Object.keys(input).forEach((key) => { input[key] = false; });
        }

        function getMovement() {
            let horizontal = (keyboardInput.left || touchInput.left ? -1 : 0) + (keyboardInput.right || touchInput.right ? 1 : 0);
            let vertical = (keyboardInput.up || touchInput.up ? -1 : 0) + (keyboardInput.down || touchInput.down ? 1 : 0);
            const magnitude = Math.hypot(horizontal, vertical);
            if (magnitude > 0) {
                horizontal /= magnitude;
                vertical /= magnitude;
            }
            return { horizontal, vertical };
        }

        function resetGame() {
            player = { x: width * 0.2, y: height / 2, radius: 12 };
            cannons = [];
            bullets = [];
            survivalTime = 0;
            backgroundDistance = 0;
            cannonTimer = 1.4;
            clearInput(keyboardInput);
            clearInput(touchInput);
            draw();
        }

        function spawnCannon() {
            const side = Math.random() < 0.5 ? 'top' : 'bottom';
            const cannon = {
                x: width + 34,
                side,
                size: 28,
                angle: side === 'top' ? Math.PI / 2 : -Math.PI / 2,
                targetAngle: 0,
                shootTimer: 0.65
            };
            cannon.targetAngle = getCannonTargetAngle(cannon);
            cannons.push(cannon);
        }

        function getCannonMount(cannon) {
            return {
                x: cannon.x + cannon.size / 2,
                y: cannon.side === 'top' ? wallHeight - 2 : height - wallHeight + 2
            };
        }

        function getCannonTargetAngle(cannon) {
            const mount = getCannonMount(cannon);
            return Math.atan2(player.y - mount.y, player.x - mount.x);
        }

        function getCannonMuzzle(cannon) {
            const mount = getCannonMount(cannon);
            return {
                x: mount.x + Math.cos(cannon.angle) * cannonBarrelLength,
                y: mount.y + Math.sin(cannon.angle) * cannonBarrelLength
            };
        }

        function angleDifference(from, to) {
            return Math.atan2(Math.sin(to - from), Math.cos(to - from));
        }

        function spawnBullet(cannon) {
            const muzzle = getCannonMuzzle(cannon);
            bullets.push({
                x: muzzle.x,
                y: muzzle.y,
                radius: 5,
                velocityX: Math.cos(cannon.angle) * bulletSpeed,
                velocityY: Math.sin(cannon.angle) * bulletSpeed
            });
        }

        function update(delta) {
            const movement = getMovement();
            player.x = clamp(player.x + movement.horizontal * playerSpeed * delta, player.radius + 4, width - player.radius - 4);
            player.y = clamp(player.y + movement.vertical * playerSpeed * delta, wallHeight + player.radius + 4, height - wallHeight - player.radius - 4);
            survivalTime += delta;
            backgroundDistance += worldSpeed * delta;
            cannonTimer -= delta;

            if (cannonTimer <= 0) {
                spawnCannon();
                cannonTimer = Math.max(0.45, 2.35 - survivalTime * 0.025);
            }

            cannons.forEach((cannon) => {
                cannon.x -= worldSpeed * delta;
                cannon.targetAngle = getCannonTargetAngle(cannon);
                const rotation = angleDifference(cannon.angle, cannon.targetAngle);
                cannon.angle += clamp(rotation, -cannonRotationSpeed * delta, cannonRotationSpeed * delta);
                cannon.shootTimer -= delta;
                if (cannon.shootTimer <= 0 && Math.abs(angleDifference(cannon.angle, cannon.targetAngle)) < 0.08) {
                    spawnBullet(cannon);
                    cannon.shootTimer += cannonShootInterval;
                }
            });

            bullets.forEach((bullet) => {
                bullet.x += bullet.velocityX * delta;
                bullet.y += bullet.velocityY * delta;
            });

            if (bullets.some((bullet) => Math.hypot(player.x - bullet.x, player.y - bullet.y) < player.radius + bullet.radius)) {
                endGame();
                return;
            }

            cannons = cannons.filter((cannon) => cannon.x > -cannon.size - 12);
            bullets = bullets.filter((bullet) => bullet.x > -bullet.radius && bullet.x < width + bullet.radius && bullet.y > wallHeight - bullet.radius && bullet.y < height - wallHeight + bullet.radius);
        }

        function draw() {
            context.clearRect(0, 0, width, height);
            context.fillStyle = '#07111d';
            context.fillRect(0, 0, width, height);

            context.fillStyle = '#0b2535';
            context.fillRect(0, wallHeight, width, height - wallHeight * 2);
            const segmentStart = Math.floor(backgroundDistance / 96) - 2;
            for (let index = segmentStart; index < segmentStart + 10; index += 1) {
                const segmentX = index * 96 - backgroundDistance;
                context.fillStyle = index % 2 === 0 ? '#0d2b3b' : '#0a2231';
                context.fillRect(segmentX, wallHeight, 68, height - wallHeight * 2);
            }

            context.fillStyle = 'rgba(139, 208, 255, 0.32)';
            const dashDistance = backgroundDistance * 1.35;
            const dashStart = Math.floor(dashDistance / 119) - 2;
            for (let index = dashStart; index < dashStart + 9; index += 1) {
                const dashX = index * 119 - dashDistance;
                const dashY = wallHeight + 42 + positiveModulo(index * 37, height - wallHeight * 2 - 62);
                context.fillRect(dashX, dashY, 30, 2);
            }

            context.fillStyle = '#1b3448';
            context.fillRect(0, 0, width, wallHeight);
            context.fillRect(0, height - wallHeight, width, wallHeight);
            context.fillStyle = '#3c6d87';
            context.fillRect(0, wallHeight - 5, width, 5);
            context.fillRect(0, height - wallHeight, width, 5);
            const wallDistance = backgroundDistance * 1.6;
            const wallStart = Math.floor(wallDistance / 64) - 2;
            for (let index = wallStart; index < wallStart + 12; index += 1) {
                const segmentX = index * 64 - wallDistance;
                context.fillStyle = '#264b61';
                context.fillRect(segmentX, 7, 38, 5);
                context.fillRect(segmentX, height - 12, 38, 5);
            }

            cannons.forEach((cannon) => {
                const mount = getCannonMount(cannon);
                const bodyY = cannon.side === 'top' ? 6 : height - wallHeight + 6;
                context.fillStyle = '#ef6f6c';
                context.fillRect(cannon.x, bodyY, cannon.size, wallHeight - 10);
                context.save();
                context.translate(mount.x, mount.y);
                context.rotate(cannon.angle);
                context.fillStyle = '#f4c95d';
                context.fillRect(0, -4, cannonBarrelLength, 8);
                context.fillStyle = '#ef6f6c';
                context.fillRect(8, -7, 12, 14);
                context.restore();
                context.fillStyle = '#ffffff';
                context.fillRect(cannon.x + 5, bodyY + 5, 4, 4);
            });

            bullets.forEach((bullet) => {
                context.fillStyle = '#f4c95d';
                context.beginPath();
                context.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
                context.fill();
                context.strokeStyle = 'rgba(244, 201, 93, 0.35)';
                context.lineWidth = 3;
                context.stroke();
            });

            context.save();
            context.translate(player.x, player.y);
            context.fillStyle = '#8bd0ff';
            context.beginPath();
            context.moveTo(player.radius + 8, 0);
            context.lineTo(-player.radius, -player.radius);
            context.lineTo(-player.radius / 2, 0);
            context.lineTo(-player.radius, player.radius);
            context.closePath();
            context.fill();
            context.restore();

            context.fillStyle = '#ffffff';
            context.font = 'bold 16px Arial, sans-serif';
            context.fillText('Time: ' + Math.floor(survivalTime) + 's', 16, 22);
        }

        function endGame() {
            running = false;
            if (frameId !== null) cancelAnimationFrame(frameId);
            frameId = null;
            clearInput(keyboardInput);
            clearInput(touchInput);
            startButton.textContent = 'Play again';
            status.textContent = 'Game over after ' + Math.floor(survivalTime) + ' seconds. Press Play again to restart.';
            draw();
        }

        function gameLoop(timestamp) {
            if (!running) return;
            const delta = Math.min((timestamp - lastTime) / 1000, 0.05);
            lastTime = timestamp;
            update(delta);
            draw();
            if (running) frameId = requestAnimationFrame(gameLoop);
        }

        function startGame() {
            if (frameId !== null) cancelAnimationFrame(frameId);
            resetGame();
            running = true;
            lastTime = performance.now();
            startButton.textContent = 'Restart demo';
            status.textContent = 'Playing. Move in 8 directions and avoid the cannon fire.';
            canvas.focus();
            frameId = requestAnimationFrame(gameLoop);
        }

        function setTouchDirection(direction, pressed) {
            clearInput(touchInput);
            if (!pressed) return;
            const parts = direction.split('-');
            touchInput.left = parts.includes('left');
            touchInput.right = parts.includes('right');
            touchInput.up = parts.includes('up');
            touchInput.down = parts.includes('down');
        }

        function setKeyboardDirection(event, pressed) {
            const key = event.key.toLowerCase();
            if (event.key === 'ArrowLeft' || key === 'a') keyboardInput.left = pressed;
            if (event.key === 'ArrowRight' || key === 'd') keyboardInput.right = pressed;
            if (event.key === 'ArrowUp' || key === 'w') keyboardInput.up = pressed;
            if (event.key === 'ArrowDown' || key === 's') keyboardInput.down = pressed;
            return event.key.startsWith('Arrow') || ['a', 'd', 'w', 's'].includes(key);
        }

        startButton.addEventListener('click', startGame);
        demo.querySelectorAll('[data-game-direction]').forEach((button) => {
            const direction = button.dataset.gameDirection;
            button.addEventListener('pointerdown', (event) => {
                event.preventDefault();
                button.setPointerCapture?.(event.pointerId);
                setTouchDirection(direction, true);
            });
            ['pointerup', 'pointercancel', 'pointerleave'].forEach((eventName) => button.addEventListener(eventName, () => setTouchDirection(direction, false)));
            button.addEventListener('click', () => {
                setTouchDirection(direction, true);
                window.setTimeout(() => setTouchDirection(direction, false), 180);
            });
        });

        window.addEventListener('keydown', (event) => {
            if (setKeyboardDirection(event, true)) event.preventDefault();
        });
        window.addEventListener('keyup', (event) => {
            if (setKeyboardDirection(event, false)) event.preventDefault();
        });

        resetGame();
    };
})();
