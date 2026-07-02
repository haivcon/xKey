import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const quoteArg = (arg) => {
  const value = String(arg);
  if (!/[\s"`';&|<>()[\]{}$]/.test(value)) return value;
  return `"${value.replace(/(["\\])/g, '\\$1').replace(/\r?\n/g, '\\n')}"`;
};

const run = (cmd, args, opts = {}) => {
  console.log(`\n> ${[cmd, ...args].map(quoteArg).join(' ')}`);
  execFileSync(cmd, args, {
    stdio: 'inherit',
    windowsHide: true,
    shell: process.platform === 'win32' && cmd.endsWith('.cmd'),
    ...opts,
  });
};
const out = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', windowsHide: true }).trim();
const safeOut = (cmd, args) => {
  try {
    return out(cmd, args);
  } catch {
    return '';
  }
};
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const writeJson = (file, value) => writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

const args = process.argv.slice(2);
const options = { bump: 'patch', note: '', noteFile: '', push: true, checks: true };
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (['patch', 'minor', 'major'].includes(arg)) options.bump = arg;
  else if (arg === '--note' || arg === '-n') options.note = args[++i] || '';
  else if (arg.startsWith('--note=')) options.note = arg.slice(7);
  else if (arg === '--note-file' || arg === '-N') options.noteFile = args[++i] || '';
  else if (arg.startsWith('--note-file=')) options.noteFile = arg.slice(12);
  else if (arg === '--no-push') options.push = false;
  else if (arg === '--skip-checks') options.checks = false;
  else throw new Error(`Unknown argument: ${arg}`);
}

if (options.note && options.noteFile) {
  throw new Error('Use either --note or --note-file, not both.');
}

if (options.noteFile) {
  if (!existsSync(options.noteFile)) throw new Error(`Note file does not exist: ${options.noteFile}`);
  options.note = readFileSync(options.noteFile, 'utf8');
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

const runChecks = () => {
  run(npmCmd, ['run', 'type-check']);
  run(npmCmd, ['run', 'lint']);
  run(npmCmd, ['run', 'test']);
  run(npmCmd, ['audit', '--omit=dev', '--audit-level=high']);
};

const commitToReleaseNote = (message) => message
  .replace(/^(feat|fix|perf|refactor|style|docs|test|build|ci|chore)(\([^)]+\))?!?:\s*/i, '')
  .replace(/^release\s+v?\d+\.\d+\.\d+$/i, '')
  .trim();

const changeVerb = {
  A: 'Added',
  C: 'Copied',
  D: 'Removed',
  M: 'Updated',
  R: 'Renamed',
  T: 'Changed type for',
  U: 'Resolved conflict in',
  X: 'Changed',
};

const describeChangedFile = (file, status, stats = {}) => {
  const verb = changeVerb[status[0]] || 'Changed';
  const sizeHint = Number.isFinite(stats.added) && Number.isFinite(stats.deleted)
    ? ` (+${stats.added}/-${stats.deleted})`
    : '';

  if (file === 'package.json') {
    return `${verb} package.json${sizeHint}: synchronized the app version and npm package metadata for this release.`;
  }

  if (file === 'package-lock.json') {
    return `${verb} package-lock.json${sizeHint}: kept the locked dependency metadata aligned with package.json.`;
  }

  if (file === 'CHANGELOG.md') {
    return `${verb} CHANGELOG.md${sizeHint}: added the generated release notes and version metadata for the new release.`;
  }

  if (file === 'android/app/build.gradle') {
    return `${verb} android/app/build.gradle${sizeHint}: bumped Android versionName/versionCode so the APK/AAB can be published as a new build.`;
  }

  if (file === 'scripts/release.mjs') {
    return `${verb} scripts/release.mjs${sizeHint}: improved the release automation, generated commit details, tag notes, changelog entries, and Windows npm command handling.`;
  }

  if (file.startsWith('.github/workflows/')) {
    return `${verb} ${file}${sizeHint}: adjusted GitHub Actions automation used for CI, APK/AAB builds, signing, or GitHub Release publishing.`;
  }

  if (file.startsWith('src/locales/') || file === 'to_translate.json') {
    return `${verb} ${file}${sizeHint}: refreshed translation/localization content shown in the app UI.`;
  }

  if (file.startsWith('src/components/')) {
    return `${verb} ${file}${sizeHint}: updated a reusable UI component or settings/dashboard screen behavior.`;
  }

  if (file.startsWith('src/features/')) {
    return `${verb} ${file}${sizeHint}: updated feature-specific application logic.`;
  }

  if (file.startsWith('src/hooks/')) {
    return `${verb} ${file}${sizeHint}: updated shared React hook behavior used by the app.`;
  }

  if (file.startsWith('src/utils/')) {
    return `${verb} ${file}${sizeHint}: updated shared utility logic used across the app.`;
  }

  if (file.startsWith('src/workers/')) {
    return `${verb} ${file}${sizeHint}: updated background worker logic for heavier client-side processing.`;
  }

  if (file === 'src/App.tsx' || file === 'src/App.css' || file === 'src/index.css' || file === 'src/main.tsx') {
    return `${verb} ${file}${sizeHint}: updated the main app shell, styling, routing, or startup behavior.`;
  }

  if (file.startsWith('tests/')) {
    return `${verb} ${file}${sizeHint}: updated automated test coverage for release validation.`;
  }

  if (file.endsWith('.md')) {
    return `${verb} ${file}${sizeHint}: refreshed project documentation.`;
  }

  if (file.startsWith('android/')) {
    return `${verb} ${file}${sizeHint}: updated Android project configuration or native build files.`;
  }

  if (file.startsWith('public/') || file.startsWith('assets/') || file.startsWith('icons/')) {
    return `${verb} ${file}${sizeHint}: updated public assets, icons, or installable app resources.`;
  }

  return `${verb} ${file}${sizeHint}: updated project source/configuration used by the release.`;
};

const changedFileStats = () => {
  const stats = new Map();
  safeOut('git', ['diff', '--numstat', 'HEAD'])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [added, deleted, ...pathParts] = line.split(/\t/);
      const file = pathParts.join('\t');
      stats.set(file, {
        added: added === '-' ? undefined : Number(added),
        deleted: deleted === '-' ? undefined : Number(deleted),
      });
    });
  return stats;
};

const changedFiles = () => {
  const stats = changedFileStats();
  return safeOut('git', ['diff', '--name-status', 'HEAD'])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [status, ...pathParts] = line.split(/\t/);
      const file = pathParts.at(-1);
      return describeChangedFile(file, status, stats.get(file));
    });
};

const releaseBullets = (noteText) => noteText
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => `- ${line}`)
  .join('\n');

const replaceRequired = (content, pattern, replacement, file, section) => {
  if (!pattern.test(content)) throw new Error(`Cannot find ${section} in ${file}.`);
  return content.replace(pattern, replacement);
};

const updateReleaseDocs = ({ version, code, noteText }) => {
  const tag = `v${version}`;
  const bullets = releaseBullets(noteText);

  const readmePath = 'README.md';
  const readme = readFileSync(readmePath, 'utf8');
  writeFileSync(readmePath, replaceRequired(
    readme,
    /## Current Release: v[^\r\n]+[\s\S]*?(?=\r?\n---\r?\n\r?\n## Core Features)/,
    `## Current Release: ${tag}\n\nxKey ${tag} is the current synchronized web and Android release. This release updates the app version metadata, Android build metadata, documentation, and release automation notes used for GitHub Releases.\n\n### What's New\n\n${bullets}\n- **Android release metadata:** \`versionName ${version}\`, \`versionCode ${code}\`.`,
    readmePath,
    'current release section',
  ));

  const architecturePath = 'ARCHITECTURE.md';
  const architecture = readFileSync(architecturePath, 'utf8');
  const updatedArchitecture = replaceRequired(
    architecture,
    /## 8\. Android Build Metadata[\s\S]*?(?=\r?\n---\r?\n\r?\n## 9\. Build and Release Pipeline)/,
    `## 8. Android Build Metadata\n\nFor ${tag}:\n\n- \`package.json\` version: \`${version}\`\n- \`package-lock.json\` version: \`${version}\`\n- Android \`versionName\`: \`${version}\`\n- Android \`versionCode\`: \`${code}\`\n- Android application ID/package: \`com.haivcon.xkey\`\n\n\`android/app/build.gradle\` owns application version metadata and release build settings.`,
    architecturePath,
    'Android build metadata section',
  ).replace(/Create an annotated tag such as `v[^`]+`/g, `Create an annotated tag such as \`${tag}\``);
  writeFileSync(architecturePath, updatedArchitecture);

  const securityPath = 'SECURITY.md';
  const security = readFileSync(securityPath, 'utf8');
  writeFileSync(securityPath, replaceRequired(
    security,
    /## Current Release Security Notes: v[^\r\n]+[\s\S]*?(?=\r?\n---\r?\n\r?\n## Supported Security Scope)/,
    `## Current Release Security Notes: ${tag}\n\n${tag} is a synchronized web and Android release. It updates release documentation, package metadata, and Android build metadata without changing the local-only custody model by default.\n\nSecurity-relevant notes:\n\n${bullets}\n- Android metadata is updated to \`versionCode ${code}\` and \`versionName ${version}\`.\n- The offline-first vault model, encryption boundaries, backup ownership, and secret-handling requirements remain unchanged unless explicitly stated above.`,
    securityPath,
    'current release security notes section',
  ));

  const conductPath = 'CODE_OF_CONDUCT.md';
  const conduct = readFileSync(conductPath, 'utf8');
  writeFileSync(conductPath, replaceRequired(
    conduct,
    /Community release work should respect the current repository structure, keep older release notes compact, and never include local-only folders such as `1\/`, generated APK\/AAB files, or secret environment files\. The current release documentation target is `v[^`]+`\./,
    `Community release work should respect the current repository structure, keep older release notes compact, and never include local-only folders such as \`1/\`, generated APK/AAB files, or secret environment files. The current release documentation target is \`${tag}\`.`,
    conductPath,
    'release hygiene target',
  ));
};

const generateReleaseNote = () => {
  const latestTag = safeOut('git', ['describe', '--tags', '--abbrev=0']);
  const range = latestTag ? `${latestTag}..HEAD` : 'HEAD';
  const commits = safeOut('git', ['log', range, '--pretty=format:%s'])
    .split(/\r?\n/)
    .map((line) => commitToReleaseNote(line))
    .filter(Boolean)
    .filter((line) => !/^chore:\s*release\s+v?\d+\.\d+\.\d+$/i.test(line));

  const uniqueCommits = [...new Set(commits)];
  const fileNotes = changedFiles();

  if (uniqueCommits.length || fileNotes.length) {
    return [
      ...uniqueCommits.map((commit) => `Release change: ${commit}.`),
      ...fileNotes,
    ].join('\n');
  }

  return 'Maintenance release with synchronized web and Android version metadata.';
};

try {
  out('git', ['rev-parse', '--is-inside-work-tree']);
  const branch = out('git', ['branch', '--show-current']) || 'main';

  const pkg = json('package.json');
  const nextVersion = bump(pkg.version, options.bump);
  const tag = `v${nextVersion}`;
  ensureTagIsFree(tag);

  if (options.checks) {
    runChecks();
  }

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

  const releaseNoteText = options.note.trim() || generateReleaseNote();
  updateReleaseDocs({ version: nextVersion, code: nextCode, noteText: releaseNoteText });

  const changelogPath = 'CHANGELOG.md';
  const changelog = readFileSync(changelogPath, 'utf8');
  const introPattern = /(All notable changes to xKey are summarized here\. Older details are intentionally compact so the current release remains easy to audit\.\r?\n\r?\n)/;
  const note = releaseBullets(releaseNoteText);
  const entry = `## [${nextVersion}] - ${new Date().toISOString().slice(0, 10)}\n\n### Release Notes\n\n${note}\n\n### Release Metadata\n\n- \`package.json\`: \`${nextVersion}\`\n- \`package-lock.json\`: \`${nextVersion}\`\n- Android \`versionName\`: \`${nextVersion}\`\n- Android \`versionCode\`: \`${nextCode}\`\n\n`;
  if (!introPattern.test(changelog)) throw new Error('Cannot find CHANGELOG insertion point.');
  writeFileSync(changelogPath, changelog.replace(introPattern, `$1${entry}`));

  console.log(`Prepared ${tag}: package ${nextVersion}, Android versionCode ${nextCode}.`);

  run('git', ['add', '-A']);
  run('git', ['commit', '-m', `chore: release ${tag}`, '-m', releaseNoteText]);
  run('git', ['tag', '-a', tag, '-m', `Release ${tag}`, '-m', releaseNoteText]);
  if (options.push) {
    run('git', ['push', 'origin', branch]);
    run('git', ['push', 'origin', tag]);
  }
  console.log(`\nDone. ${tag} was ${options.push ? 'pushed and will trigger GitHub Actions' : 'created locally'}.`);
} catch (error) {
  console.error(`\nRelease failed: ${error.message}`);
  process.exit(1);
}
