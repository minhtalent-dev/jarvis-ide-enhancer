const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const assetPath = path.join(__dirname, '..', 'assets', 'vscode-custom.js');
const source = fs.readFileSync(assetPath, 'utf8');
const startMarker = '// AUTOCOMPLETE_SEARCH_HELPER_START';
const endMarker = '// AUTOCOMPLETE_SEARCH_HELPER_END';
const startIndex = source.indexOf(startMarker);
const endIndex = source.indexOf(endMarker);

assert.notEqual(startIndex, -1, 'helper start marker exists');
assert.notEqual(endIndex, -1, 'helper end marker exists');
assert.equal(source.indexOf(startMarker, startIndex + startMarker.length), -1, 'start marker occurs once');
assert.equal(source.indexOf(endMarker, endIndex + endMarker.length), -1, 'end marker occurs once');
assert.ok(endIndex > startIndex, 'helper markers are ordered');

const helperSource = source.slice(startIndex + startMarker.length, endIndex);
const sandbox = {};
new vm.Script(`${helperSource}\nthis.filterSlashCommands = filterSlashCommands;`).runInNewContext(sandbox);
const filterSlashCommands = sandbox.filterSlashCommands;
const runFilter = (...args) => Array.from(filterSlashCommands(...args));

test('matches MCP commands from slash and explicit MCP queries', () => {
    const command = { token: '/mcp:oracle-mes-test', desc: 'Oracle MES' };

    assert.deepEqual(runFilter([command], '/mes'), [command]);
    assert.deepEqual(runFilter([command], '/mcp:mes'), [command]);
});

test('ranks token body prefixes before token substrings and descriptions', () => {
    const prefix = { token: '/mcp:mes-primary', desc: 'matches' };
    const substring = { token: '/mcp:oracle-mes-test', desc: 'other' };
    const description = { token: '/mcp:oracle', desc: 'MES support' };

    assert.deepEqual(runFilter([description, substring, prefix], '/mes'), [prefix, substring, description]);
});

test('preserves source order for matches with the same rank', () => {
    const first = { token: '/mcp:alpha-mes', desc: '' };
    const second = { token: '/mcp:beta-mes', desc: '' };

    assert.deepEqual(runFilter([first, second], '/mes'), [first, second]);
});

test('matches case-insensitively and normalizes NFC and NFD', () => {
    const composed = { token: '/café', desc: '' };
    const decomposed = { token: `/cafe\u0301`, desc: '' };

    assert.deepEqual(runFilter([composed], '/CAFÉ'), [composed]);
    assert.deepEqual(runFilter([composed], `/cafe\u0301`), [composed]);
    assert.deepEqual(runFilter([decomposed], '/CAFÉ'), [decomposed]);
});

test('returns no records when no token or description matches', () => {
    assert.deepEqual(runFilter([{ token: '/mcp:oracle', desc: 'database' }], '/missing'), []);
});

test('returns the first 50 valid commands in source order for an empty query', () => {
    const commands = Array.from({ length: 55 }, (_, index) => ({ token: `/command-${index}`, desc: '' }));

    assert.deepEqual(runFilter(commands, '/'), commands.slice(0, 50));
});

test('skips malformed records and safely stringifies descriptions', () => {
    const command = { token: '/lookup', desc: 42 };
    const unsafeDescription = { token: '/other', desc: { toString() { throw new Error('not convertible'); } } };
    const commands = [null, 'invalid', {}, { token: 42 }, unsafeDescription, command];

    assert.deepEqual(runFilter(commands, '/42'), [command]);
    assert.deepEqual(runFilter(commands, '/missing'), []);
});

test('returns original objects without mutating the command list or records', () => {
    const command = Object.freeze({ token: '/mcp:mes-test', desc: 'MES' });
    const commands = Object.freeze([command]);

    const result = runFilter(commands, '/mes');

    assert.equal(result[0], command);
    assert.deepEqual(commands, [command]);
});