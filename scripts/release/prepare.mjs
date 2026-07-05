import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, '../..');
const releaseBranch = process.env.RELEASE_BRANCH || 'main';
const versionArg = process.argv[2];

function fail(message) {
    console.error(`[release:prepare] ${message}`);
    process.exit(1);
}

function run(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: root,
        stdio: 'inherit',
        ...options,
    });

    if (result.status !== 0) {
        fail(`Command failed: ${command} ${args.join(' ')}`);
    }
}

function capture(command, args) {
    const result = spawnSync(command, args, {
        cwd: root,
        encoding: 'utf8',
    });

    if (result.status !== 0) {
        fail(`Command failed: ${command} ${args.join(' ')}`);
    }

    return result.stdout.trim();
}

function readVersion() {
    const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    return packageJson.version;
}

function isValidVersionArgument(value) {
    return /^(major|minor|patch|premajor|preminor|prepatch|prerelease)$/.test(value)
        || /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value);
}

if (!versionArg || !isValidVersionArgument(versionArg)) {
    fail('Usage: npm run release:prepare -- <major|minor|patch|version>');
}

const branch = capture('git', ['branch', '--show-current']);
if (!branch) fail('Cannot release from a detached HEAD.');
if (branch !== releaseBranch) {
    fail(`Release must run from ${releaseBranch}. Current branch: ${branch}. Set RELEASE_BRANCH to override.`);
}

const status = capture('git', ['status', '--porcelain']);
if (status) {
    fail('Working tree must be clean before preparing a release.');
}

run('npm', ['version', versionArg]);

const version = readVersion();
const tag = `v${version}`;

run('git', ['push', 'origin', branch]);
run('git', ['push', 'origin', tag]);

console.log(`\nPrepared ${tag}.`);
console.log('Build artifacts from this version before finishing:');
console.log('  npm run web:build');
console.log('  npm run electron:build -- --publish never');
console.log('  npm run release:finish');
