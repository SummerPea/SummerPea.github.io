(function () {
    'use strict';

    const COLUMNS = 25;
    const ROWS = 15;
    const CELL_SIZE = 28;
    const GOAL_ROW = 7;
    const USER_TEAM = 'user';
    const CPU_TEAM = 'cpu';
    const PLAYER_MOVE_RANGE = 2;
    const PLAYER_ANIMATION_MS = 520;
    const BALL_SPEED = 360;
    const WINNING_SCORE = 3;

    window.setupSoccerDemo = function setupSoccerDemo(demo) {
        const canvas = demo.querySelector('#soccer-canvas');
        const context = canvas?.getContext('2d');
        const actionButtons = [...demo.querySelectorAll('[data-soccer-action]')];
        const confirmButton = demo.querySelector('#soccer-confirm');
        const cancelButton = demo.querySelector('#soccer-cancel');
        const restartButton = demo.querySelector('#soccer-restart');
        const status = demo.querySelector('#soccer-status');
        const userScore = demo.querySelector('#soccer-user-score');
        const cpuScore = demo.querySelector('#soccer-cpu-score');
        const turnLabel = demo.querySelector('#soccer-turn-label');
        if (!canvas || !context || !confirmButton || !cancelButton || !restartButton || !status || !userScore || !cpuScore || !turnLabel) return;

        let players = [];
        let ball;
        let scores;
        let phase;
        let selectedPlayerId;
        let actionMode;
        let stagedAction;
        let overlayMessage;
        let animationFrame = null;
        let turnNumber = 1;
        let roundToken = 0;

        const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
        const manhattan = (first, second) => Math.abs(first.x - second.x) + Math.abs(first.y - second.y);
        const sameGrid = (first, second) => first.x === second.x && first.y === second.y;
        const gridKey = (grid) => grid.x + ',' + grid.y;
        const isFieldGrid = (grid) => grid.x >= 0 && grid.x < COLUMNS && grid.y >= 0 && grid.y < ROWS;
        const isGoalGrid = (grid) => (grid.x === -1 || grid.x === COLUMNS) && grid.y === GOAL_ROW;
        const opponentTeam = (team) => team === USER_TEAM ? CPU_TEAM : USER_TEAM;
        const attackDirection = (team) => team === USER_TEAM ? 1 : -1;
        const attackingGoal = (team) => ({ x: team === USER_TEAM ? COLUMNS : -1, y: GOAL_ROW });

        function gridCenter(grid) {
            return {
                x: (grid.x + 1) * CELL_SIZE + CELL_SIZE / 2,
                y: grid.y * CELL_SIZE + CELL_SIZE / 2
            };
        }

        function playerById(id) {
            return players.find((player) => player.id === id);
        }

        function teamPlayers(team) {
            return players.filter((player) => player.team === team);
        }

        function playerPixel(player) {
            if (Number.isFinite(player.renderX) && Number.isFinite(player.renderY)) {
                return { x: player.renderX, y: player.renderY };
            }
            return gridCenter(player);
        }

        function ballGrid() {
            if (ball.state === 'possessed') {
                const owner = playerById(ball.ownerId);
                return owner ? { x: owner.x, y: owner.y } : { x: 12, y: GOAL_ROW };
            }
            return { x: ball.x, y: ball.y };
        }

        function possessionTeam() {
            if (ball.state !== 'possessed') return null;
            return playerById(ball.ownerId)?.team || null;
        }

        function directionToward(from, to) {
            const horizontal = Math.sign(to.x - from.x);
            const vertical = Math.sign(to.y - from.y);
            if (horizontal === 0 && vertical === 0) return null;
            return { x: horizontal, y: vertical };
        }

        function createPlayers() {
            const userFormation = [[11, 7], [7, 3], [7, 11], [3, 5], [3, 9]];
            const cpuFormation = [[13, 7], [17, 3], [17, 11], [21, 5], [21, 9]];
            const roster = [];
            userFormation.forEach((position, index) => {
                roster.push({ id: 'u' + index, team: USER_TEAM, number: index + 1, x: position[0], y: position[1], direction: { x: 1, y: 0 }, renderX: null, renderY: null });
            });
            cpuFormation.forEach((position, index) => {
                roster.push({ id: 'c' + index, team: CPU_TEAM, number: index + 1, x: position[0], y: position[1], direction: { x: -1, y: 0 }, renderX: null, renderY: null });
            });
            return roster;
        }

        function resetPositions(kickoffTeam) {
            players = createPlayers();
            const ownerId = kickoffTeam === USER_TEAM ? 'u0' : 'c0';
            ball = { state: 'possessed', ownerId, x: null, y: null, renderX: null, renderY: null };
            selectedPlayerId = kickoffTeam === USER_TEAM ? ownerId : 'u0';
            actionMode = null;
            stagedAction = null;
        }

        function resetMatch() {
            roundToken += 1;
            if (animationFrame !== null) cancelAnimationFrame(animationFrame);
            animationFrame = null;
            scores = { user: 0, cpu: 0 };
            turnNumber = 1;
            overlayMessage = null;
            resetPositions(USER_TEAM);
            beginUserTurn('Your kickoff. Select an action for the player with the ball.');
        }

        function selectedPlayer() {
            const player = playerById(selectedPlayerId);
            return player?.team === USER_TEAM ? player : null;
        }

        function selectedHasBall() {
            return ball.state === 'possessed' && ball.ownerId === selectedPlayerId;
        }

        function setStatus(message) {
            status.textContent = message;
        }

        function updateInterface() {
            const userTurn = phase === 'user-turn';
            const selected = selectedPlayer();
            actionButtons.forEach((button) => {
                const action = button.dataset.soccerAction;
                const requiresBall = action === 'pass' || action === 'shoot';
                button.disabled = !userTurn || !selected || (requiresBall && !selectedHasBall());
                button.classList.toggle('is-active', actionMode === action);
            });
            confirmButton.disabled = !userTurn || !stagedAction;
            cancelButton.disabled = !userTurn || (!actionMode && !stagedAction);
            userScore.textContent = String(scores.user);
            cpuScore.textContent = String(scores.cpu);
            if (phase === 'user-turn') turnLabel.textContent = 'Your turn ' + turnNumber;
            if (phase === 'animating') turnLabel.textContent = 'Resolving';
            if (phase === 'goal') turnLabel.textContent = 'Goal';
            if (phase === 'game-over') turnLabel.textContent = 'Full time';
        }

        function beginUserTurn(message) {
            phase = 'user-turn';
            actionMode = null;
            stagedAction = null;
            overlayMessage = null;
            if (possessionTeam() === USER_TEAM) {
                selectedPlayerId = ball.ownerId;
            } else if (!selectedPlayer()) {
                selectedPlayerId = closestPlayer(USER_TEAM, ballGrid()).id;
            }
            setStatus(message || 'Your turn. Select a blue player and plan one action.');
            updateInterface();
            draw();
        }

        function cancelAction() {
            if (phase !== 'user-turn') return;
            actionMode = null;
            stagedAction = null;
            setStatus(selectedHasBall() ? 'Choose Move, Pass, or Shoot.' : 'Choose Move for the selected player.');
            updateInterface();
            draw();
        }

        function chooseActionMode(action) {
            if (phase !== 'user-turn') return;
            const player = selectedPlayer();
            if (!player) return;
            if ((action === 'pass' || action === 'shoot') && !selectedHasBall()) {
                setStatus('Only the player controlling the ball can pass or shoot.');
                return;
            }
            actionMode = action;
            stagedAction = null;
            if (action === 'move') setStatus('Choose a highlighted grid within Manhattan distance 2.');
            if (action === 'pass') setStatus('Choose any field grid. A nearby teammate will move to receive the pass.');
            if (action === 'shoot') setStatus('Choose the highlighted opponent goal.');
            updateInterface();
            draw();
        }

        function validMoveTargets(player) {
            const targets = [];
            for (let y = 0; y < ROWS; y += 1) {
                for (let x = 0; x < COLUMNS; x += 1) {
                    const target = { x, y };
                    const distance = manhattan(player, target);
                    if (distance > 0 && distance <= PLAYER_MOVE_RANGE) targets.push(target);
                }
            }
            return targets;
        }

        function nearestPassReceiver(actor, target) {
            const candidates = teamPlayers(actor.team)
                .filter((player) => player.id !== actor.id)
                .map((player) => ({ player, distance: manhattan(player, target) }))
                .sort((first, second) => first.distance - second.distance || first.player.id.localeCompare(second.player.id));
            return candidates[0]?.distance <= PLAYER_MOVE_RANGE ? candidates[0].player : null;
        }

        function stageTarget(target) {
            const actor = selectedPlayer();
            if (!actor || !actionMode) return;
            if (actionMode === 'move') {
                if (!isFieldGrid(target) || manhattan(actor, target) === 0 || manhattan(actor, target) > PLAYER_MOVE_RANGE) {
                    setStatus('That grid is outside this player’s move range.');
                    return;
                }
                stagedAction = { type: 'move', actorId: actor.id, target: { x: target.x, y: target.y } };
                setStatus('Move planned. Confirm to resolve the turn, or cancel to choose again.');
            }
            if (actionMode === 'pass') {
                if (!isFieldGrid(target)) {
                    setStatus('Choose a grid inside the field for the pass.');
                    return;
                }
                const receiver = nearestPassReceiver(actor, target);
                stagedAction = { type: 'pass', actorId: actor.id, target: { x: target.x, y: target.y }, receiverId: receiver?.id || null };
                setStatus(receiver ? 'Pass planned for player ' + receiver.number + '. Confirm to resolve the turn.' : 'Pass planned into open space. Confirm to resolve the turn.');
            }
            if (actionMode === 'shoot') {
                const goal = attackingGoal(USER_TEAM);
                if (!sameGrid(target, goal)) {
                    setStatus('Choose the highlighted opponent goal.');
                    return;
                }
                stagedAction = { type: 'shoot', actorId: actor.id, target: goal };
                setStatus('Shot planned. Confirm to resolve the turn.');
            }
            updateInterface();
            draw();
        }

        function canvasGrid(event) {
            const bounds = canvas.getBoundingClientRect();
            const canvasX = (event.clientX - bounds.left) * (canvas.width / bounds.width);
            const canvasY = (event.clientY - bounds.top) * (canvas.height / bounds.height);
            return {
                x: Math.floor(canvasX / CELL_SIZE) - 1,
                y: clamp(Math.floor(canvasY / CELL_SIZE), 0, ROWS - 1)
            };
        }

        function handleCanvasClick(event) {
            if (phase !== 'user-turn') return;
            canvas.focus();
            const target = canvasGrid(event);
            if (actionMode) {
                stageTarget(target);
                return;
            }
            if (!isFieldGrid(target)) return;
            const clickedPlayer = teamPlayers(USER_TEAM).find((player) => sameGrid(player, target));
            if (!clickedPlayer) return;
            if (possessionTeam() === USER_TEAM && clickedPlayer.id !== ball.ownerId) {
                setStatus('While your team has possession, you can only control the player with the ball.');
                return;
            }
            selectedPlayerId = clickedPlayer.id;
            stagedAction = null;
            setStatus(selectedHasBall() ? 'Player ' + clickedPlayer.number + ' has the ball. Choose an action.' : 'Player ' + clickedPlayer.number + ' selected. Choose Move.');
            updateInterface();
            draw();
        }

        actionButtons.forEach((button) => button.addEventListener('click', () => chooseActionMode(button.dataset.soccerAction)));
        confirmButton.addEventListener('click', () => {
            if (phase === 'user-turn' && stagedAction) resolveTurn(stagedAction);
        });
        cancelButton.addEventListener('click', cancelAction);
        restartButton.addEventListener('click', resetMatch);
        canvas.addEventListener('click', handleCanvasClick);
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && phase === 'user-turn' && (actionMode || stagedAction)) {
                event.preventDefault();
                cancelAction();
            }
            if (event.key === 'Enter' && phase === 'user-turn' && stagedAction) {
                event.preventDefault();
                resolveTurn(stagedAction);
            }
        });

        function closestPlayer(team, target, excludedId) {
            return teamPlayers(team)
                .filter((player) => player.id !== excludedId)
                .slice()
                .sort((first, second) => manhattan(first, target) - manhattan(second, target) || first.id.localeCompare(second.id))[0];
        }

        function reachableCells(player, includeCurrent) {
            const cells = [];
            for (let y = 0; y < ROWS; y += 1) {
                for (let x = 0; x < COLUMNS; x += 1) {
                    const cell = { x, y };
                    const distance = manhattan(player, cell);
                    if (distance <= PLAYER_MOVE_RANGE && (includeCurrent || distance > 0)) cells.push(cell);
                }
            }
            return cells;
        }

        function nearestOpponentDistance(team, cell) {
            return Math.min(...teamPlayers(opponentTeam(team)).map((player) => manhattan(player, cell)));
        }

        function chooseBestReachableCell(player, scoreCell) {
            return reachableCells(player, true)
                .map((cell) => ({ cell, score: scoreCell(cell) }))
                .sort((first, second) => second.score - first.score || manhattan(player, first.cell) - manhattan(player, second.cell) || first.cell.y - second.cell.y || first.cell.x - second.cell.x)[0].cell;
        }

        function stepToward(player, target) {
            return chooseBestReachableCell(player, (cell) => {
                const occupiedPenalty = players.some((other) => other.id !== player.id && sameGrid(other, cell)) ? 1.5 : 0;
                return -manhattan(cell, target) - occupiedPenalty;
            });
        }

        function pointSegmentDistance(point, start, end) {
            const deltaX = end.x - start.x;
            const deltaY = end.y - start.y;
            const lengthSquared = deltaX * deltaX + deltaY * deltaY;
            if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
            const amount = clamp(((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / lengthSquared, 0, 1);
            const projection = { x: start.x + amount * deltaX, y: start.y + amount * deltaY };
            return Math.hypot(point.x - projection.x, point.y - projection.y);
        }

        function shotLaneIsClear(owner, goal) {
            return teamPlayers(opponentTeam(owner.team)).every((player) => pointSegmentDistance(player, owner, goal) > 1.1);
        }

        function chooseBallOwnerAction(owner) {
            const goal = attackingGoal(owner.team);
            const distanceToGoal = manhattan(owner, goal);
            if (distanceToGoal <= 8 && shotLaneIsClear(owner, goal)) {
                return { type: 'shoot', actorId: owner.id, target: goal };
            }

            const direction = attackDirection(owner.team);
            const underPressure = nearestOpponentDistance(owner.team, owner) <= 2;
            const passCandidates = teamPlayers(owner.team)
                .filter((player) => player.id !== owner.id)
                .map((player) => {
                    const target = chooseBestReachableCell(player, (cell) => {
                        const progress = direction * (cell.x - player.x);
                        const openness = nearestOpponentDistance(owner.team, cell);
                        return progress * 3 + openness - Math.abs(cell.y - GOAL_ROW) * 0.12;
                    });
                    const advancement = direction * (target.x - owner.x);
                    const openness = nearestOpponentDistance(owner.team, target);
                    return { player, target, score: advancement * 3 + openness * 1.5 - manhattan(owner, target) * 0.2 };
                })
                .sort((first, second) => second.score - first.score);

            if (passCandidates.length && (underPressure || passCandidates[0].score > 8 || turnNumber % 3 === 0)) {
                const choice = passCandidates[0];
                return { type: 'pass', actorId: owner.id, target: choice.target, receiverId: choice.player.id };
            }

            const target = chooseBestReachableCell(owner, (cell) => {
                const progress = direction * (cell.x - owner.x);
                const openness = nearestOpponentDistance(owner.team, cell);
                const goalDistance = manhattan(cell, goal);
                return progress * 4 + openness * 1.25 - goalDistance * 0.35 - Math.abs(cell.y - GOAL_ROW) * 0.08;
            });
            return { type: 'move', actorId: owner.id, target };
        }

        function chooseSupportMove(player, currentPossession, currentBall) {
            const teammates = teamPlayers(player.team);
            const nearestTeammate = teammates.slice().sort((first, second) => manhattan(first, currentBall) - manhattan(second, currentBall) || first.id.localeCompare(second.id))[0];

            if (!currentPossession) {
                if (nearestTeammate.id === player.id) return stepToward(player, currentBall);
                const direction = attackDirection(player.team);
                const lane = [GOAL_ROW, 3, 11, 5, 9][player.number - 1];
                return stepToward(player, { x: clamp(player.x + direction, 0, COLUMNS - 1), y: lane });
            }

            if (currentPossession !== player.team) {
                if (nearestTeammate.id === player.id) return stepToward(player, currentBall);
                const opponent = teamPlayers(currentPossession)
                    .slice()
                    .sort((first, second) => manhattan(player, first) - manhattan(player, second) || first.id.localeCompare(second.id))[0];
                const defensiveSide = player.team === USER_TEAM ? -1 : 1;
                return stepToward(player, { x: clamp(opponent.x + defensiveSide, 0, COLUMNS - 1), y: opponent.y });
            }

            const direction = attackDirection(player.team);
            const lane = [GOAL_ROW, 3, 11, 5, 9][player.number - 1];
            return chooseBestReachableCell(player, (cell) => {
                const progress = direction * (cell.x - player.x);
                const spacing = Math.min(...teammates.filter((other) => other.id !== player.id).map((other) => manhattan(other, cell)));
                return progress * 2.5 + Math.min(spacing, 5) * 0.5 - Math.abs(cell.y - lane) * 0.7;
            });
        }

        function buildTurnActions(userAction) {
            const actions = new Map();
            players.forEach((player) => actions.set(player.id, { type: 'hold', actorId: player.id, target: { x: player.x, y: player.y } }));
            actions.set(userAction.actorId, userAction);

            const owner = ball.state === 'possessed' ? playerById(ball.ownerId) : null;
            if (owner && owner.id !== userAction.actorId) actions.set(owner.id, chooseBallOwnerAction(owner));

            const ballAction = owner ? actions.get(owner.id) : null;
            if (ballAction?.type === 'pass' && ballAction.receiverId) {
                const receiver = playerById(ballAction.receiverId);
                if (receiver && manhattan(receiver, ballAction.target) <= PLAYER_MOVE_RANGE) {
                    actions.set(receiver.id, { type: 'move', actorId: receiver.id, target: ballAction.target, receivingPass: true });
                }
            }

            const currentPossession = possessionTeam();
            const currentBall = ballGrid();
            players.forEach((player) => {
                const existing = actions.get(player.id);
                if (existing.type !== 'hold') return;
                const target = chooseSupportMove(player, currentPossession, currentBall);
                actions.set(player.id, { type: 'move', actorId: player.id, target });
            });
            return actions;
        }

        function nearestFreeGrid(origin, intended, unavailable) {
            const candidates = [];
            for (let y = 0; y < ROWS; y += 1) {
                for (let x = 0; x < COLUMNS; x += 1) {
                    const cell = { x, y };
                    if (!unavailable.has(gridKey(cell))) candidates.push(cell);
                }
            }
            candidates.sort((first, second) => manhattan(first, intended) - manhattan(second, intended) || manhattan(first, origin) - manhattan(second, origin) || first.y - second.y || first.x - second.x);
            return candidates[0] || { x: origin.x, y: origin.y };
        }

        function resolveMovementCollisions(actions) {
            const intended = new Map();
            players.forEach((player) => {
                const action = actions.get(player.id);
                const target = action.type === 'move' && isFieldGrid(action.target) && manhattan(player, action.target) <= PLAYER_MOVE_RANGE
                    ? { x: action.target.x, y: action.target.y }
                    : { x: player.x, y: player.y };
                intended.set(player.id, target);
            });

            const groups = new Map();
            players.forEach((player) => {
                const target = intended.get(player.id);
                const key = gridKey(target);
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(player);
            });

            const resolved = new Map();
            const unavailable = new Set();
            groups.forEach((group, key) => {
                if (group.length === 1) {
                    resolved.set(group[0].id, intended.get(group[0].id));
                    unavailable.add(key);
                } else {
                    unavailable.add(key);
                }
            });

            groups.forEach((group, key) => {
                if (group.length < 2) return;
                group.slice().sort((first, second) => first.id.localeCompare(second.id)).forEach((player) => {
                    const fallback = nearestFreeGrid(player, intended.get(player.id), unavailable);
                    resolved.set(player.id, fallback);
                    unavailable.add(gridKey(fallback));
                });
            });
            return resolved;
        }

        function resolveTurn(userAction) {
            if (phase !== 'user-turn') return;
            phase = 'animating';
            actionMode = null;
            stagedAction = null;
            setStatus('Both teams are acting simultaneously.');
            updateInterface();

            const actions = buildTurnActions(userAction);
            const movementTargets = resolveMovementCollisions(actions);
            players.forEach((player) => {
                const target = movementTargets.get(player.id);
                const direction = directionToward(player, target);
                if (direction) player.direction = direction;
            });

            const owner = ball.state === 'possessed' ? playerById(ball.ownerId) : null;
            const ownerAction = owner ? actions.get(owner.id) : null;
            let ballPlan = null;
            if (owner && (ownerAction.type === 'pass' || ownerAction.type === 'shoot')) {
                const direction = directionToward(owner, ownerAction.target);
                if (direction) owner.direction = direction;
                ballPlan = {
                    kind: ownerAction.type,
                    team: owner.team,
                    actorId: owner.id,
                    receiverId: ownerAction.receiverId || null,
                    target: { x: ownerAction.target.x, y: ownerAction.target.y },
                    start: possessedBallPixel(owner)
                };
                const plannedCatcher = findBallCatcher(ballPlan, movementTargets);
                if (plannedCatcher) {
                    ballPlan.catcherId = plannedCatcher.id;
                    ballPlan.flightTarget = movementTargets.get(plannedCatcher.id);
                }
            }
            animateTurn(movementTargets, ballPlan);
        }

        function possessedBallPixel(owner) {
            const center = playerPixel(owner);
            const length = Math.hypot(owner.direction.x, owner.direction.y) || 1;
            const offset = CELL_SIZE * 0.38;
            return {
                x: center.x + owner.direction.x / length * offset,
                y: center.y + owner.direction.y / length * offset
            };
        }

        function animateTurn(movementTargets, ballPlan) {
            const startingPixels = new Map();
            const endingPixels = new Map();
            players.forEach((player) => {
                startingPixels.set(player.id, gridCenter(player));
                endingPixels.set(player.id, gridCenter(movementTargets.get(player.id)));
            });

            let ballDuration = 0;
            let ballEnd = null;
            if (ballPlan) {
                ballEnd = gridCenter(ballPlan.flightTarget || ballPlan.target);
                ballDuration = Math.hypot(ballEnd.x - ballPlan.start.x, ballEnd.y - ballPlan.start.y) / BALL_SPEED * 1000;
                ball.state = 'flight';
                ball.ownerId = null;
                ball.renderX = ballPlan.start.x;
                ball.renderY = ballPlan.start.y;
            }

            const duration = Math.max(PLAYER_ANIMATION_MS, ballDuration);
            let startedAt = null;

            function frame(timestamp) {
                if (startedAt === null) startedAt = timestamp;
                const elapsed = timestamp - startedAt;
                const playerProgress = clamp(elapsed / PLAYER_ANIMATION_MS, 0, 1);
                const easedProgress = 1 - Math.pow(1 - playerProgress, 3);
                players.forEach((player) => {
                    const start = startingPixels.get(player.id);
                    const end = endingPixels.get(player.id);
                    player.renderX = start.x + (end.x - start.x) * easedProgress;
                    player.renderY = start.y + (end.y - start.y) * easedProgress;
                });

                if (ballPlan) {
                    const ballProgress = clamp(elapsed / ballDuration, 0, 1);
                    ball.renderX = ballPlan.start.x + (ballEnd.x - ballPlan.start.x) * ballProgress;
                    ball.renderY = ballPlan.start.y + (ballEnd.y - ballPlan.start.y) * ballProgress;
                }
                draw();

                if (elapsed < duration) {
                    animationFrame = requestAnimationFrame(frame);
                    return;
                }

                animationFrame = null;
                players.forEach((player) => {
                    const target = movementTargets.get(player.id);
                    player.x = target.x;
                    player.y = target.y;
                    player.renderX = null;
                    player.renderY = null;
                });

                let result = { message: 'Turn resolved. Plan your next action.' };
                if (ballPlan) {
                    result = resolveBallFlight(ballPlan);
                } else if (ball.state === 'free') {
                    result = resolveStationaryBall();
                }
                if (result.paused) return;
                turnNumber += 1;
                beginUserTurn(result.message);
            }

            animationFrame = requestAnimationFrame(frame);
        }

        function segmentProjection(point, start, end) {
            const deltaX = end.x - start.x;
            const deltaY = end.y - start.y;
            const lengthSquared = deltaX * deltaX + deltaY * deltaY;
            if (lengthSquared === 0) return { distance: Math.hypot(point.x - start.x, point.y - start.y), amount: 0 };
            const amount = clamp(((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / lengthSquared, 0, 1);
            const projectionX = start.x + amount * deltaX;
            const projectionY = start.y + amount * deltaY;
            return { distance: Math.hypot(point.x - projectionX, point.y - projectionY), amount };
        }

        function findBallCatcher(plan, plannedPositions) {
            const end = gridCenter(plan.target);
            return players
                .filter((player) => {
                    if (player.id === plan.actorId) return false;
                    if (player.team !== plan.team) return true;
                    return plan.kind === 'pass';
                })
                .map((player) => {
                    const position = plannedPositions?.get(player.id) || player;
                    const projection = segmentProjection(gridCenter(position), plan.start, end);
                    return { player, distance: projection.distance, amount: projection.amount };
                })
                .filter((candidate) => candidate.amount > 0.04 && candidate.distance <= CELL_SIZE * 0.48)
                .sort((first, second) => first.amount - second.amount || first.distance - second.distance)[0]?.player || null;
        }

        function giveBallTo(player) {
            ball = { state: 'possessed', ownerId: player.id, x: null, y: null, renderX: null, renderY: null };
        }

        function resolveStationaryBall() {
            const collector = players.find((player) => player.x === ball.x && player.y === ball.y);
            if (!collector) return { paused: false, message: 'The ball remains loose. Select a player to recover it.' };
            giveBallTo(collector);
            return { paused: false, message: (collector.team === USER_TEAM ? 'Your' : 'CPU') + ' player ' + collector.number + ' collected the loose ball.' };
        }

        function resolveBallFlight(plan) {
            const catcher = plan.catcherId ? playerById(plan.catcherId) : findBallCatcher(plan);
            if (catcher) {
                giveBallTo(catcher);
                const relationship = catcher.team === plan.team ? 'completed the pass' : 'intercepted the ball';
                return { paused: false, message: 'Player ' + catcher.number + ' ' + relationship + '. Plan the next turn.' };
            }

            if (isGoalGrid(plan.target)) {
                const correctGoal = plan.target.x === (plan.team === USER_TEAM ? COLUMNS : -1);
                if (correctGoal) {
                    scoreGoal(plan.team);
                    return { paused: true, message: '' };
                }
            }

            if (isFieldGrid(plan.target)) {
                ball = { state: 'free', ownerId: null, x: plan.target.x, y: plan.target.y, renderX: null, renderY: null };
                return { paused: false, message: plan.kind === 'pass' ? 'The pass reached open space. Select a player to recover it.' : 'The shot stayed in play.' };
            }

            const recipient = closestPlayer(opponentTeam(plan.team), { x: clamp(plan.target.x, 0, COLUMNS - 1), y: clamp(plan.target.y, 0, ROWS - 1) });
            giveBallTo(recipient);
            return { paused: false, message: 'The ball went out. Possession goes to the closest opposing player.' };
        }

        function scoreGoal(team) {
            scores[team] += 1;
            overlayMessage = 'GOAL';
            phase = 'goal';
            setStatus(team === USER_TEAM ? 'GOAL! Your team scored.' : 'GOAL! The CPU scored.');
            updateInterface();
            draw();

            if (scores[team] >= WINNING_SCORE) {
                phase = 'game-over';
                overlayMessage = team === USER_TEAM ? 'YOU WIN' : 'CPU WINS';
                setStatus(team === USER_TEAM ? 'Full time: you won the match.' : 'Full time: the CPU won the match.');
                updateInterface();
                draw();
                return;
            }

            const kickoffTeam = opponentTeam(team);
            const token = ++roundToken;
            window.setTimeout(() => {
                if (token !== roundToken) return;
                resetPositions(kickoffTeam);
                turnNumber += 1;
                const message = kickoffTeam === USER_TEAM
                    ? 'Your kickoff. The player with the ball is selected.'
                    : 'CPU kickoff. Select any blue player to defend.';
                beginUserTurn(message);
            }, 1100);
        }

        function drawField() {
            context.fillStyle = '#123d22';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = '#2f8a48';
            context.fillRect(CELL_SIZE, 0, COLUMNS * CELL_SIZE, ROWS * CELL_SIZE);
            for (let column = 0; column < COLUMNS; column += 5) {
                context.fillStyle = column % 10 === 0 ? 'rgba(255, 255, 255, 0.035)' : 'rgba(0, 0, 0, 0.035)';
                context.fillRect((column + 1) * CELL_SIZE, 0, CELL_SIZE * 5, canvas.height);
            }

            context.strokeStyle = 'rgba(255, 255, 255, 0.16)';
            context.lineWidth = 1;
            for (let column = 0; column <= COLUMNS; column += 1) {
                const x = CELL_SIZE + column * CELL_SIZE;
                context.beginPath();
                context.moveTo(x, 0);
                context.lineTo(x, canvas.height);
                context.stroke();
            }
            for (let row = 0; row <= ROWS; row += 1) {
                const y = row * CELL_SIZE;
                context.beginPath();
                context.moveTo(CELL_SIZE, y);
                context.lineTo(canvas.width - CELL_SIZE, y);
                context.stroke();
            }

            context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            context.lineWidth = 2;
            context.strokeRect(CELL_SIZE, 0, COLUMNS * CELL_SIZE, ROWS * CELL_SIZE);
            context.beginPath();
            context.moveTo(canvas.width / 2, 0);
            context.lineTo(canvas.width / 2, canvas.height);
            context.stroke();
            context.beginPath();
            context.arc(canvas.width / 2, canvas.height / 2, CELL_SIZE * 2, 0, Math.PI * 2);
            context.stroke();

            drawGoal({ x: -1, y: GOAL_ROW });
            drawGoal({ x: COLUMNS, y: GOAL_ROW });
        }

        function drawGoal(goal) {
            const left = (goal.x + 1) * CELL_SIZE;
            const top = goal.y * CELL_SIZE;
            context.fillStyle = 'rgba(255, 255, 255, 0.14)';
            context.fillRect(left, top, CELL_SIZE, CELL_SIZE);
            context.strokeStyle = 'rgba(255, 255, 255, 0.95)';
            context.lineWidth = 2;
            context.strokeRect(left + 1, top + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            context.strokeStyle = 'rgba(255, 255, 255, 0.35)';
            context.lineWidth = 1;
            for (let offset = 7; offset < CELL_SIZE; offset += 7) {
                context.beginPath();
                context.moveTo(left + offset, top);
                context.lineTo(left + offset, top + CELL_SIZE);
                context.stroke();
                context.beginPath();
                context.moveTo(left, top + offset);
                context.lineTo(left + CELL_SIZE, top + offset);
                context.stroke();
            }
        }

        function drawCellHighlight(grid, fill, stroke) {
            const left = (grid.x + 1) * CELL_SIZE;
            const top = grid.y * CELL_SIZE;
            context.fillStyle = fill;
            context.fillRect(left + 2, top + 2, CELL_SIZE - 4, CELL_SIZE - 4);
            context.strokeStyle = stroke;
            context.lineWidth = 2;
            context.strokeRect(left + 3, top + 3, CELL_SIZE - 6, CELL_SIZE - 6);
        }

        function drawActionHighlights() {
            const actor = selectedPlayer();
            if (phase !== 'user-turn' || !actor || !actionMode) return;
            if (actionMode === 'move') {
                validMoveTargets(actor).forEach((target) => drawCellHighlight(target, 'rgba(139, 208, 255, 0.24)', 'rgba(139, 208, 255, 0.8)'));
            }
            if (actionMode === 'pass') {
                context.fillStyle = 'rgba(244, 201, 93, 0.08)';
                context.fillRect(CELL_SIZE, 0, COLUMNS * CELL_SIZE, ROWS * CELL_SIZE);
            }
            if (actionMode === 'shoot') {
                drawCellHighlight(attackingGoal(USER_TEAM), 'rgba(244, 201, 93, 0.35)', '#f4c95d');
            }
            if (stagedAction) {
                drawCellHighlight(stagedAction.target, 'rgba(255, 255, 255, 0.3)', '#ffffff');
            }
        }

        function drawPlayers() {
            players.forEach((player) => {
                const center = playerPixel(player);
                const size = 18;
                context.fillStyle = player.team === USER_TEAM ? '#5eb7ee' : '#ef786b';
                context.fillRect(center.x - size / 2, center.y - size / 2, size, size);
                context.strokeStyle = player.id === selectedPlayerId && phase === 'user-turn' ? '#f4c95d' : 'rgba(255, 255, 255, 0.9)';
                context.lineWidth = player.id === selectedPlayerId && phase === 'user-turn' ? 3 : 1.5;
                context.strokeRect(center.x - size / 2, center.y - size / 2, size, size);
                context.fillStyle = '#07111d';
                context.font = 'bold 10px Arial, sans-serif';
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText(String(player.number), center.x, center.y + 0.5);
                if (ball.state === 'possessed' && ball.ownerId === player.id) {
                    context.strokeStyle = '#ffffff';
                    context.lineWidth = 2;
                    context.beginPath();
                    context.arc(center.x, center.y, 13, 0, Math.PI * 2);
                    context.stroke();
                }
            });
        }

        function drawBall() {
            let position;
            if (ball.state === 'possessed') {
                const owner = playerById(ball.ownerId);
                if (!owner) return;
                position = possessedBallPixel(owner);
            } else if (ball.state === 'flight' && Number.isFinite(ball.renderX)) {
                position = { x: ball.renderX, y: ball.renderY };
            } else {
                position = gridCenter(ball);
            }
            context.fillStyle = '#ffffff';
            context.strokeStyle = '#07111d';
            context.lineWidth = 1.5;
            context.beginPath();
            context.arc(position.x, position.y, 5.5, 0, Math.PI * 2);
            context.fill();
            context.stroke();
            context.fillStyle = '#07111d';
            context.beginPath();
            context.arc(position.x, position.y, 1.8, 0, Math.PI * 2);
            context.fill();
        }

        function drawOverlay() {
            if (!overlayMessage) return;
            context.fillStyle = 'rgba(7, 17, 29, 0.68)';
            context.fillRect(0, canvas.height / 2 - 45, canvas.width, 90);
            context.fillStyle = '#ffffff';
            context.font = 'bold 38px Arial, sans-serif';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(overlayMessage, canvas.width / 2, canvas.height / 2);
        }

        function draw() {
            context.clearRect(0, 0, canvas.width, canvas.height);
            drawField();
            drawActionHighlights();
            drawPlayers();
            drawBall();
            drawOverlay();
            context.textAlign = 'left';
            context.textBaseline = 'alphabetic';
        }

        resetMatch();
    };
})();
