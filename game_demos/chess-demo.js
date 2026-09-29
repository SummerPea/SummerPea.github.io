(function () {
    'use strict';

    const NAME = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
    const ICON = {
        human: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
        cpu: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
    };
    const coordinate = (square) => 'abcdefgh'[square % 8] + (8 - Math.floor(square / 8));

    window.setupChessDemo = function setupChessDemo(demo) {
        const rules = window.SparklingChessEngine;
        const board = demo.querySelector('#chess-board');
        const humanCoins = demo.querySelector('#chess-human-coins');
        const cpuCoins = demo.querySelector('#chess-cpu-coins');
        const turnLabel = demo.querySelector('#chess-turn');
        const status = demo.querySelector('#chess-status');
        const restart = demo.querySelector('#chess-restart');
        const deployButtons = [...demo.querySelectorAll('[data-chess-deploy]')];
        if (!rules || !board || !humanCoins || !cpuCoins || !turnLabel || !status || !restart) return;

        let game = rules.createGame();
        let selection = null;
        let computerTimer = null;
        let message = 'Your turn. Select your king or move toward a coin.';
        let focusedSquare = null;

        function selectedTargets(actions) {
            if (!selection) return new Set();
            return new Set(actions.filter((action) => action.kind === selection.kind &&
                (selection.kind === 'move' ? action.from === selection.from : action.type === selection.type))
                .map((action) => action.to));
        }

        function render() {
            const finished = rules.outcome(game);
            const yourTurn = game.turn === 'human' && !finished;
            const actions = yourTurn ? rules.legalActions(game) : [];
            const targets = selectedTargets(actions);
            humanCoins.textContent = game.bank.human;
            cpuCoins.textContent = game.bank.cpu;
            turnLabel.textContent = finished ? 'Game over' : yourTurn ? 'Your turn' : 'Computer turn';
            status.textContent = message;

            board.innerHTML = game.board.map((piece, square) => {
                const coin = game.coins.has(square);
                const selected = selection?.kind === 'move' && selection.from === square;
                const previous = game.lastAction?.from === square || game.lastAction?.to === square;
                const checked = piece?.type === 'k' && rules.isInCheck(game, piece.side);
                const classes = ['chess-square', (Math.floor(square / 8) + square % 8) % 2 ? 'dark' : 'light'];
                if (targets.has(square)) classes.push('legal');
                if (selected) classes.push('selected');
                if (previous) classes.push('previous');
                if (checked) classes.push('checked');
                const contents = piece
                    ? `<span class="chess-piece ${piece.side}" aria-hidden="true">${ICON[piece.side][piece.type]}</span>${coin ? '<span class="chess-coin under-piece" aria-hidden="true">✦</span>' : ''}`
                    : coin ? '<span class="chess-coin" aria-hidden="true">✦</span>' : '';
                const occupant = piece ? `${piece.side === 'human' ? 'your' : 'computer'} ${NAME[piece.type]}${coin ? ', coin underneath' : ''}` : coin ? 'coin' : 'empty';
                const hint = targets.has(square) ? ', legal target' : '';
                return `<button class="${classes.join(' ')}" type="button" data-square="${square}" aria-label="${coordinate(square)}, ${occupant}${hint}" ${yourTurn ? '' : 'disabled'}>${contents}</button>`;
            }).join('');
            if (yourTurn && focusedSquare !== null) {
                board.querySelector(`[data-square="${focusedSquare}"]`)?.focus({ preventScroll: true });
            }

            deployButtons.forEach((button) => {
                const type = button.dataset.chessDeploy;
                button.disabled = !actions.some((action) => action.kind === 'deploy' && action.type === type);
                button.setAttribute('aria-pressed', String(selection?.kind === 'deploy' && selection.type === type));
            });
        }

        function describe(action, before, side) {
            const who = side === 'human' ? 'You' : 'Computer';
            if (action.kind === 'deploy') return `${who} deployed a ${NAME[action.type]} on ${coordinate(action.to)}.`;
            const piece = before.board[action.from];
            const capture = before.board[action.to] || (piece.type === 'p' && before.enPassant?.target === action.to);
            const verb = capture ? 'captured on' : 'moved to';
            const coin = before.coins.has(action.to) ? ' Collected a coin.' : '';
            const promotion = piece.type === 'p' && game.board[action.to].type === 'q' ? ' Promoted to a queen.' : '';
            return `${who} ${verb} ${coordinate(action.to)} with ${NAME[piece.type]}.${coin}${promotion}`;
        }

        function makeMove(action) {
            const before = game;
            const side = before.turn;
            game = rules.applyAction(before, action);
            selection = null;
            message = describe(action, before, side);
            const result = rules.outcome(game);
            if (result) {
                message += result.reason === 'stalemate'
                    ? ' Stalemate. The game is a draw.'
                    : ` Checkmate! ${result.winner === 'human' ? 'You win!' : 'Computer wins.'}`;
            } else if (rules.isInCheck(game, game.turn)) {
                message += game.turn === 'human' ? ' Your king is in check.' : ' Computer king is in check.';
            }
            render();
            if (!result && game.turn === 'cpu') {
                computerTimer = window.setTimeout(() => {
                    computerTimer = null;
                    const answer = rules.chooseComputerAction(game);
                    if (answer) makeMove(answer);
                }, 380);
            }
        }

        function handleSquare(square) {
            if (game.turn !== 'human' || rules.outcome(game)) return;
            const actions = rules.legalActions(game);
            const target = actions.find((action) => selection && action.kind === selection.kind && action.to === square &&
                (selection.kind === 'move' ? action.from === selection.from : action.type === selection.type));
            if (target) {
                makeMove(target);
                return;
            }
            if (game.board[square]?.side === 'human') {
                selection = selection?.kind === 'move' && selection.from === square ? null : { kind: 'move', from: square };
                message = selection
                    ? `Selected your ${NAME[game.board[square].type]} on ${coordinate(square)}. Choose a highlighted square.`
                    : 'Selection cleared. Choose one of your pieces or deploy a piece.';
            } else {
                message = selection ? 'Choose a highlighted square, or select a different piece.' : 'Select one of your pieces or a deploy button first.';
            }
            render();
        }

        board.addEventListener('click', (event) => {
            const button = event.target.closest('[data-square]');
            if (button && board.contains(button)) handleSquare(Number(button.dataset.square));
        });

        board.addEventListener('focusin', (event) => {
            if (event.target.matches('[data-square]')) focusedSquare = Number(event.target.dataset.square);
        });

        board.addEventListener('keydown', (event) => {
            const square = Number(event.target.dataset.square);
            if (!Number.isInteger(square) || !event.target.matches('[data-square]')) return;
            const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -8, ArrowDown: 8 };
            const step = steps[event.key];
            if (!step) return;
            const next = square + step;
            if (next < 0 || next >= 64 || (Math.abs(step) === 1 && Math.floor(next / 8) !== Math.floor(square / 8))) return;
            event.preventDefault();
            board.querySelector(`[data-square="${next}"]`)?.focus();
        });

        deployButtons.forEach((button) => button.addEventListener('click', () => {
            const type = button.dataset.chessDeploy;
            selection = selection?.kind === 'deploy' && selection.type === type ? null : { kind: 'deploy', type };
            message = selection ? `Deploy ${NAME[type]}: choose a highlighted square.` : 'Deployment selection cleared.';
            render();
        }));

        restart.addEventListener('click', () => {
            if (computerTimer !== null) window.clearTimeout(computerTimer);
            computerTimer = null;
            game = rules.createGame();
            selection = null;
            focusedSquare = null;
            message = 'New game. Select your king or move toward a coin.';
            render();
        });

        render();
    };
})();
