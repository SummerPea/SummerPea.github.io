const assert = require('node:assert/strict');
const chess = require('../game_demos/chess-engine.js');

const at = (file, rank) => (8 - rank) * 8 + 'abcdefgh'.indexOf(file);

function position(turn = 'human') {
    const game = chess.createGame(() => 0);
    game.board.fill(null);
    game.coins.clear();
    game.bank = { human: 0, cpu: 0 };
    game.turn = turn;
    game.enPassant = null;
    return game;
}

function piece(game, side, type, file, rank, moved = false) {
    game.board[at(file, rank)] = { side, type, moved };
}

function hasAction(actions, kind, to, from, type) {
    return actions.some((action) => action.kind === kind && action.to === to &&
        (kind === 'move' ? action.from === from : action.type === type));
}

const opening = chess.createGame(() => 0);
assert.equal(opening.coins.size, 1);
assert.equal(opening.board.filter(Boolean).length, 2);

const collection = position();
piece(collection, 'human', 'k', 'e', 1);
piece(collection, 'cpu', 'k', 'e', 8);
collection.coins.add(at('e', 2));
assert.equal(hasAction(chess.legalActions(collection), 'move', at('e', 2), at('e', 1)), true);
const collected = chess.applyAction(collection, { kind: 'move', from: at('e', 1), to: at('e', 2) }, () => 0, false);
assert.equal(collected.bank.human, 1);
assert.equal(collected.coins.has(at('e', 2)), false);

const deploy = position();
piece(deploy, 'human', 'k', 'e', 1);
piece(deploy, 'cpu', 'k', 'e', 8);
deploy.bank.human = 1;
deploy.coins.add(at('a', 2));
assert.equal(hasAction(chess.legalActions(deploy), 'deploy', at('a', 2), null, 'p'), true);
assert.equal(hasAction(chess.legalActions(deploy), 'deploy', at('a', 3), null, 'p'), false);
const deployed = chess.applyAction(deploy, { kind: 'deploy', type: 'p', to: at('a', 2) }, () => 0, false);
assert.equal(deployed.bank.human, 0);
assert.equal(deployed.bank.human, 1, 'a coin under the deployed piece is collected after paying its cost');
assert.equal(deployed.coins.has(at('a', 2)), false, 'deployment collects the coin on the target square');

const checked = position();
piece(checked, 'human', 'k', 'e', 1);
piece(checked, 'cpu', 'k', 'a', 8);
piece(checked, 'cpu', 'r', 'e', 3);
checked.bank.human = 1;
assert.equal(chess.isInCheck(checked, 'human'), true);
assert.equal(hasAction(chess.legalActions(checked), 'deploy', at('e', 2), null, 'p'), true);
assert.equal(hasAction(chess.legalActions(checked), 'deploy', at('a', 2), null, 'p'), false);

const adjacent = position();
piece(adjacent, 'human', 'k', 'e', 1);
piece(adjacent, 'cpu', 'k', 'e', 3);
assert.equal(hasAction(chess.legalActions(adjacent), 'move', at('e', 2), at('e', 1)), false);

const promotion = position();
piece(promotion, 'human', 'k', 'e', 1);
piece(promotion, 'cpu', 'k', 'e', 8);
piece(promotion, 'human', 'p', 'a', 7, true);
const promoted = chess.applyAction(promotion, { kind: 'move', from: at('a', 7), to: at('a', 8) }, () => 0, false);
assert.equal(promoted.board[at('a', 8)].type, 'q');

const enPassant = position('cpu');
piece(enPassant, 'human', 'k', 'e', 1);
piece(enPassant, 'cpu', 'k', 'e', 8);
piece(enPassant, 'human', 'p', 'e', 5, true);
piece(enPassant, 'cpu', 'p', 'd', 7);
const doubled = chess.applyAction(enPassant, { kind: 'move', from: at('d', 7), to: at('d', 5) }, () => 0, false);
assert.equal(hasAction(chess.legalActions(doubled), 'move', at('d', 6), at('e', 5)), true);
const captured = chess.applyAction(doubled, { kind: 'move', from: at('e', 5), to: at('d', 6) }, () => 0, false);
assert.equal(captured.board[at('d', 5)], null);
assert.equal(captured.board[at('d', 6)].side, 'human');

const mate = position();
piece(mate, 'human', 'k', 'a', 1);
piece(mate, 'cpu', 'k', 'c', 3);
piece(mate, 'cpu', 'r', 'a', 3);
piece(mate, 'cpu', 'q', 'b', 2);
assert.deepEqual(chess.outcome(mate), { winner: 'cpu', reason: 'checkmate' });

const stalemate = position();
piece(stalemate, 'human', 'k', 'a', 1);
piece(stalemate, 'cpu', 'k', 'c', 2);
piece(stalemate, 'cpu', 'q', 'b', 3);
assert.deepEqual(chess.outcome(stalemate), { winner: null, reason: 'stalemate' });

const computer = position('cpu');
piece(computer, 'human', 'k', 'e', 1);
piece(computer, 'cpu', 'k', 'e', 8);
const chosen = chess.chooseComputerAction(computer);
assert.ok(chess.legalActions(computer).some((action) => JSON.stringify(action) === JSON.stringify(chosen)));

console.log('Sparkling Chess rules passed.');
