import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const run = (cmd, args, opts = {}) => {
  console.log(`\n> ${[cmd, ...args].join(' ')}`);
  execFileSync(cmd, args, { stdio: 'inherit', windowsHide: true, ...opts });
};
const out = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', windowsHide: true }).trim();
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const writeJson = (file, value) => writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

const args = process.argv.slice(2);
const options = { bump: 'patch', note: '', push: true, checks: true };
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (['patch', 'minor', 'major'].includes(arg)) options.bump = arg;
  else if (arg === '--note' || arg === '-n') options.note = args[++i] || '';
  else if (arg.startsWith('--note=')) options.note = arg.slice(7);
  else if (arg === '--no-push') options.push = false;
  else if (arg === '--skip-checks') options.checks = false;
  else throw new Error(`Unknown argument: ${arg}`);
}

const bump = (version, type) => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`Unsupported version: ${version}`);
  const [major, minor, patch] = match.slice(1).map(Number);
  if (type === 'major') return `${major + 1}.0.0`;
  if (type === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
};

const ensureTagIsFree = (tag) => {
  if (out('git', ['tag', '--list', tag])) throw new Error(`Local tag exists: ${tag}`);
  if (out('git', ['ls-remote', '--tags', 'origin', tag])) throw new Error(`Remote tag exists: ${tag}`);
};

try {
  out('git', ['rev-parse', '--is-inside-work-tree']);
  const branch = out('git', ['branch', '--show-current']) || 'main';
  const pkg = json('package.json');
  const nextVersion = bump(pkg.version, options.bump);
  const tag = `v${nextVersion}`;
  ensureTagIsFree(tag);

  const lock = json('package-lock.json');
  pkg.version = nextVersion;
  lock.version = nextVersion;
  if (lock.packages?.['']) lock.packages[''].version = nextVersion;
  writeJson('package.json', pkg);
  writeJson('package-lock.json', lock);

  const gradlePath = 'android/app/build.gradle';
  const gradle = readFileSync(gradlePath, 'utf8');
  const codeMatch = /versionCode\s+(\d+)/.exec(gradle);
  const nameMatch = /versionName\s+"([^"]+)"/.exec(gradle);
  if (!codeMatch || !nameMatch) throw new Error('Cannot find Android versionCode/versionName.');
  const nextCode = Number(codeMatch[1]) + 1;
  writeFileSync(gradlePath, gradle
    .replace(/versionCode\s+\d+/, `versionCode ${nextCode}`)
    .replace(/versionName\s+"[^"]+"/, `versionName "${nextVersion}"`));

  const changelogPath = 'CHANGELOG.md';
  const changelog = readFileSync(changelogPath, 'utf8');
  const marker = 'All notable changes to xKey are summarized here. Older details are intentionally compact so the current release remains easy to audit.\n\n';
  const note = (options.note.trim() || 'Maintenance release with synchronized web and Android version metadata.')
    .split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => `- ${line}`).join('\n');
  const entry = `## [${nextVersion}] - ${new Date().toISOString().slice(0, 10)}\n\n### Release Notes\n\n${note}\n\n### Release Metadata\n\n- \`package.json\`: \`${nextVersion}\`\n- \`package-lock.json\`: \`${nextVersion}\`\n- Android \`versionName\`: \`${nextVersion}\`\n- Android \`versionCode\`: \`${nextCode}\`\n\n`;
  if (!changelog.includes(marker)) throw new Error('Cannot find CHANGELOG insertion point.');
  writeFileSync(changelogPath, changelog.replace(marker, `${marker}${entry}`));

  console.log(`Prepared ${tag}: package ${nextVersion}, Android versionCode ${nextCode}.`);
  if (options.checks) {
    run(npmCmd, ['run', 'type-check']);
    run(npmCmd, ['run', 'lint']);
    run(npmCmd, ['run', 'test']);
    run(npmCmd, ['audit', '--omit=dev', '--audit-level=high']);
  }

  run('git', ['add', '-A']);
  run('git', ['commit', '-m', `chore: release ${tag}`]);
  run('git', ['tag', '-a', tag, '-m', `Release ${tag}`]);
  if (options.push) {
    run('git', ['push', 'origin', branch]);
    run('git', ['push', 'origin', tag]);
  }
  console.log(`\nDone. ${tag} was ${options.push ? 'pushed and will trigger GitHub Actions' : 'created locally'}.`);
} catch (error) {
  console.error(`\nRelease failed: ${error.message}`);
  process.exit(1);
}
