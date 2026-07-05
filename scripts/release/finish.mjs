import { spawnSync } from 'node:child_process';
import {
    cpSync,
    existsSync,
    mkdtempSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, '../..');
const distDir = join(root, 'dist');
const electronDistDir = join(root, 'dist_electron');
const pagesRepo = process.env.PAGES_REPO || 'intrigue-app/intrigue-app.github.io';
const pagesBranch = process.env.PAGES_BRANCH || 'main';
const preservedPageFiles = new Set(
    (process.env.PAGES_PRESERVE || 'CNAME,.nojekyll')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
);

function fail(message) {
    console.error(`[release:finish] ${message}`);
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

function capture(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: root,
        encoding: 'utf8',
        ...options,
    });

    if (result.status !== 0) {
        fail(`Command failed: ${command} ${args.join(' ')}`);
    }

    return result.stdout.trim();
}

function commandExists(command, args = ['--version']) {
    const result = spawnSync(command, args, { stdio: 'ignore' });
    return result.status === 0;
}

function readVersion() {
    const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    return packageJson.version;
}

function assertDirectory(path, buildCommand) {
    if (!existsSync(path)) {
        fail(`Missing ${basename(path)}. Run ${buildCommand} first.`);
    }
}

function emptyPagesDirectory(path) {
    readdirSync(path, { withFileTypes: true }).forEach((entry) => {
        if (entry.name === '.git' || preservedPageFiles.has(entry.name)) return;
        rmSync(join(path, entry.name), { recursive: true, force: true });
    });
}

function copyDirectoryContents(source, destination) {
    mkdirSync(destination, { recursive: true });
    readdirSync(source, { withFileTypes: true }).forEach((entry) => {
        cpSync(join(source, entry.name), join(destination, entry.name), {
            recursive: true,
            force: true,
        });
    });
}

function ensureDraftRelease(tag, title) {
    const view = spawnSync('gh', ['release', 'view', tag, '--json', 'url,isDraft'], {
        cwd: root,
        encoding: 'utf8',
    });

    if (view.status === 0) {
        const release = JSON.parse(view.stdout);
        if (!release.isDraft) {
            fail(`${tag} already exists and is not a draft release.`);
        }
        return release.url;
    }

    run('gh', [
        'release',
        'create',
        tag,
        '--draft',
        '--title',
        title,
        '--notes',
        'Release notes pending.',
    ]);

    const created = capture('gh', ['release', 'view', tag, '--json', 'url']);
    return JSON.parse(created).url;
}

function deployPages(version) {
    const tempParent = mkdtempForPages();
    const pagesDir = join(tempParent, 'repo');

    console.log(`Cloning ${pagesRepo} into ${pagesDir}...`);
    run('gh', ['repo', 'clone', pagesRepo, pagesDir, '--', '--depth', '1']);

    const branch = capture('git', ['branch', '--show-current'], { cwd: pagesDir });
    if (branch !== pagesBranch) {
        run('git', ['checkout', pagesBranch], { cwd: pagesDir });
    }

    emptyPagesDirectory(pagesDir);
    copyDirectoryContents(distDir, pagesDir);

    const status = capture('git', ['status', '--porcelain'], { cwd: pagesDir });
    if (!status) {
        console.log('No Pages changes to deploy.');
        rmSync(tempParent, { recursive: true, force: true });
        return;
    }

    run('git', ['add', '-A'], { cwd: pagesDir });
    run('git', ['commit', '-m', `Deploy Intrigue v${version}`], { cwd: pagesDir });
    run('git', ['push', 'origin', `HEAD:${pagesBranch}`], { cwd: pagesDir });
    rmSync(tempParent, { recursive: true, force: true });
}

function mkdtempForPages() {
    return mkdtempSync(join(tmpdir(), 'intrigue-pages-'));
}

if (!commandExists('gh')) fail('GitHub CLI is required. Install and authenticate with gh auth login.');
if (!commandExists('git')) fail('git is required.');

assertDirectory(distDir, 'npm run web:build');
assertDirectory(electronDistDir, 'npm run electron:build -- --publish never');

const trackedStatus = capture('git', ['status', '--porcelain', '--untracked-files=no']);
if (trackedStatus) {
    fail('Tracked working tree changes detected. Commit or discard them before finishing the release.');
}

const version = readVersion();
const tag = `v${version}`;
const title = `Intrigue ${tag}`;

run('git', ['rev-parse', '--verify', `refs/tags/${tag}`]);

const headCommit = capture('git', ['rev-parse', 'HEAD']);
const tagCommit = capture('git', ['rev-list', '-n', '1', tag]);
if (headCommit !== tagCommit) {
    fail(`Current HEAD is not ${tag}. Check out the release commit before finishing.`);
}

const releaseUrl = ensureDraftRelease(tag, title);
deployPages(version);

console.log(`\nDraft release is ready: ${releaseUrl}`);
console.log('Upload desktop artifacts from dist_electron, then publish the release manually.');
run('gh', ['release', 'view', tag, '--web']);
