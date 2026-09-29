(function () {
    'use strict';

    const SIZE = 8;
    const COST = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    const VALUE = { p: 110, n: 325, b: 335, r: 530, q: 970, k: 0 };
    const OTHER = { human: 'cpu', cpu: 'human' };
    const KNIGHT_STEPS = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
    const KING_STEPS = [[1, 1], [1, 0], [1, -1], [0, 1], [0, -1], [-1, 1], [-1, 0], [-1, -1]];
    const ROOK_STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const BISHOP_STEPS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

    const file = (square) => square % SIZE;
    const rank = (square) => Math.floor(square / SIZE);
    const squareAt = (x, y) => y * SIZE + x;
    const onBoard = (x, y) => x >= 0 && x < SIZE && y >= 0 && y < SIZE;
    const pawnDirection = (side) => side === 'human' ? -1 : 1;
    const homeRank = (side) => side === 'human' ? 6 : 1;

    function createGame(random = Math.random) {
        const board = Array(64).fill(null);
        board[squareAt(4, 7)] = { side: 'human', type: 'k', moved: false };
        board[squareAt(4, 0)] = { side: 'cpu', type: 'k', moved: false };
        const state = {
            board,
            coins: new Set(),
            bank: { human: 0, cpu: 0 },
            turn: 'human',
            enPassant: null,
            lastAction: null,
            moveNumber: 1
        };
        spawnCoin(state, random);
        return state;
    }

    function spawnCoin(state, random = Math.random) {
        const free = [];
        for (let square = 0; square < 64; square += 1) {
            if (!state.board[square] && !state.coins.has(square)) free.push(square);
        }
        if (free.length) state.coins.add(free[Math.min(free.length - 1, Math.floor(random() * free.length))]);
    }

    function attacksSquare(state, from, target) {
        const piece = state.board[from];
        if (!piece) return false;
        const dx = file(target) - file(from);
        const dy = rank(target) - rank(from);
        if (piece.type === 'p') return Math.abs(dx) === 1 && dy === pawnDirection(piece.side);
        if (piece.type === 'n') return KNIGHT_STEPS.some(([x, y]) => x === dx && y === dy);
        if (piece.type === 'k') return Math.max(Math.abs(dx), Math.abs(dy)) === 1;

        const straight = (dx === 0 || dy === 0) && (dx !== 0 || dy !== 0);
        const diagonal = Math.abs(dx) === Math.abs(dy) && dx !== 0;
        if (!(straight && (piece.type === 'r' || piece.type === 'q')) &&
            !(diagonal && (piece.type === 'b' || piece.type === 'q'))) return false;
        const stepX = Math.sign(dx);
        const stepY = Math.sign(dy);
        let x = file(from) + stepX;
        let y = rank(from) + stepY;
        while (x !== file(target) || y !== rank(target)) {
            if (state.board[squareAt(x, y)]) return false;
            x += stepX;
            y += stepY;
        }
        return true;
    }

    function isSquareAttacked(state, square, bySide) {
        for (let from = 0; from < 64; from += 1) {
            if (state.board[from]?.side === bySide && attacksSquare(state, from, square)) return true;
        }
        return false;
    }

    function isInCheck(state, side) {
        const king = state.board.findIndex((piece) => piece?.side === side && piece.type === 'k');
        return king < 0 || isSquareAttacked(state, king, OTHER[side]);
    }

    function moveTargets(state, from) {
        const piece = state.board[from];
        if (!piece) return [];
        const x = file(from);
        const y = rank(from);
        const targets = [];
        const add = (tx, ty) => {
            if (!onBoard(tx, ty)) return;
            const to = squareAt(tx, ty);
            const occupant = state.board[to];
            if (!occupant || (occupant.side !== piece.side && occupant.type !== 'k')) targets.push(to);
        };

        if (piece.type === 'p') {
            const direction = pawnDirection(piece.side);
            const nextY = y + direction;
            if (onBoard(x, nextY) && !state.board[squareAt(x, nextY)]) {
                targets.push(squareAt(x, nextY));
                const doubleY = y + 2 * direction;
                if (!piece.moved && y === homeRank(piece.side) && !state.board[squareAt(x, doubleY)]) {
                    targets.push(squareAt(x, doubleY));
                }
            }
            for (const offset of [-1, 1]) {
                const tx = x + offset;
                if (!onBoard(tx, nextY)) continue;
                const to = squareAt(tx, nextY);
                const occupant = state.board[to];
                if (occupant?.side === OTHER[piece.side] && occupant.type !== 'k') targets.push(to);
                if (state.enPassant?.target === to && state.enPassant.side !== piece.side) targets.push(to);
            }
            return targets;
        }

        if (piece.type === 'n' || piece.type === 'k') {
            for (const [dx, dy] of piece.type === 'n' ? KNIGHT_STEPS : KING_STEPS) add(x + dx, y + dy);
            return targets;
        }

        const directions = piece.type === 'r' ? ROOK_STEPS : piece.type === 'b' ? BISHOP_STEPS : [...ROOK_STEPS, ...BISHOP_STEPS];
        for (const [dx, dy] of directions) {
            let tx = x + dx;
            let ty = y + dy;
            while (onBoard(tx, ty)) {
                const to = squareAt(tx, ty);
                const occupant = state.board[to];
                if (!occupant) targets.push(to);
                else {
                    if (occupant.side !== piece.side && occupant.type !== 'k') targets.push(to);
                    break;
                }
                tx += dx;
                ty += dy;
            }
        }
        return targets;
    }

    function applyAction(state, action, random = Math.random, spawnNextCoin = true) {
        const next = {
            board: state.board.slice(),
            coins: new Set(state.coins),
            bank: { ...state.bank },
            turn: OTHER[state.turn],
            enPassant: null,
            lastAction: action,
            moveNumber: state.moveNumber + 1
        };
        const side = state.turn;
        if (action.kind === 'deploy') {
            next.board[action.to] = { side, type: action.type, moved: false };
            next.bank[side] -= COST[action.type];
            if (next.coins.delete(action.to)) next.bank[side] += 1;
        } else {
            const piece = state.board[action.from];
            next.board[action.from] = null;
            if (piece.type === 'p' && state.enPassant?.target === action.to && !state.board[action.to]) {
                next.board[state.enPassant.pawn] = null;
            }
            next.board[action.to] = {
                side,
                type: piece.type === 'p' && rank(action.to) === (side === 'human' ? 0 : 7) ? 'q' : piece.type,
                moved: true
            };
            if (piece.type === 'p' && Math.abs(rank(action.to) - rank(action.from)) === 2) {
                next.enPassant = { target: (action.from + action.to) / 2, pawn: action.to, side };
            }
            if (next.coins.delete(action.to)) next.bank[side] += 1;
        }
        if (spawnNextCoin) spawnCoin(next, random);
        return next;
    }

    function legalActions(state, side = state.turn) {
        const position = side === state.turn ? state : { ...state, turn: side };
        const actions = [];
        for (let from = 0; from < 64; from += 1) {
            if (position.board[from]?.side !== side) continue;
            for (const to of moveTargets(position, from)) {
                const action = { kind: 'move', from, to };
                if (!isInCheck(applyAction(position, action, Math.random, false), side)) actions.push(action);
            }
        }
        for (const [type, cost] of Object.entries(COST)) {
            if (position.bank[side] < cost) continue;
            for (let to = 0; to < 64; to += 1) {
                if (position.board[to]) continue;
                if (type === 'p' && rank(to) !== homeRank(side)) continue;
                const action = { kind: 'deploy', type, to };
                if (!isInCheck(applyAction(position, action, Math.random, false), side)) actions.push(action);
            }
        }
        return actions;
    }

    function outcome(state) {
        if (legalActions(state).length) return null;
        return isInCheck(state, state.turn)
            ? { winner: OTHER[state.turn], reason: 'checkmate' }
            : { winner: null, reason: 'stalemate' };
    }

    function positionScore(state) {
        let score = 95 * (state.bank.cpu - state.bank.human);
        for (let square = 0; square < 64; square += 1) {
            const piece = state.board[square];
            if (!piece) continue;
            const sign = piece.side === 'cpu' ? 1 : -1;
            const centrality = 7 - Math.abs(file(square) - 3.5) - Math.abs(rank(square) - 3.5);
            const advance = piece.type === 'p' ? (piece.side === 'cpu' ? rank(square) - 1 : 6 - rank(square)) * 5 : 0;
            score += sign * (VALUE[piece.type] + centrality * (piece.type === 'k' ? 1 : 4) + advance);
        }
        if (isInCheck(state, 'human')) score += 50;
        if (isInCheck(state, 'cpu')) score -= 55;
        for (const coin of state.coins) {
            const distance = (side) => {
                let closest = 14;
                for (let square = 0; square < 64; square += 1) {
                    if (state.board[square]?.side !== side) continue;
                    closest = Math.min(closest, Math.max(Math.abs(file(square) - file(coin)), Math.abs(rank(square) - rank(coin))));
                }
                return closest;
            };
            score += (distance('human') - distance('cpu')) * 3;
        }
        return score;
    }

    function chooseComputerAction(state) {
        const actions = legalActions(state, 'cpu');
        if (!actions.length) return null;
        const ranked = actions.map((action) => {
            const next = applyAction(state, action, Math.random, false);
            const immediate = isInCheck(next, 'human') && !legalActions(next, 'human').length
                ? 1000000 : positionScore(next);
            return { action, next, immediate };
        }).sort((a, b) => b.immediate - a.immediate);

        let best = ranked[0];
        let bestScore = -Infinity;
        for (const candidate of ranked.slice(0, 12)) {
            if (candidate.immediate === 1000000) return candidate.action;
            const replies = legalActions(candidate.next, 'human');
            let worst = Infinity;
            if (!replies.length) worst = isInCheck(candidate.next, 'human') ? 1000000 : 0;
            for (const reply of replies) {
                const response = applyAction(candidate.next, reply, Math.random, false);
                const score = isInCheck(response, 'cpu') && !legalActions(response, 'cpu').length
                    ? -1000000 : positionScore(response);
                worst = Math.min(worst, score);
            }
            const score = worst * 0.85 + candidate.immediate * 0.15;
            if (score > bestScore) {
                bestScore = score;
                best = candidate;
            }
        }
        return best.action;
    }

    const api = { COST, createGame, spawnCoin, isSquareAttacked, isInCheck, legalActions, applyAction, outcome, chooseComputerAction };
    if (typeof window !== 'undefined') window.SparklingChessEngine = api;
    if (typeof module !== 'undefined') module.exports = api;
})();
