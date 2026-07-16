import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  readAndroidVersionMetadata,
  updateAndroidVersionMetadata,
} from '../scripts/android-version.mjs';

const assignment = `android {
  defaultConfig {
    versionCode = 127 // build
    versionName = "6.0.29" // release
  }
}
`;

assert.deepEqual(readAndroidVersionMetadata(assignment), {
  versionCode: 127,
  versionName: '6.0.29',
});
assert.equal(
  updateAndroidVersionMetadata(assignment, {
    versionCode: 128,
    versionName: '6.0.30',
  }),
  `android {
  defaultConfig {
    versionCode = 128 // build
    versionName = "6.0.30" // release
  }
}
`,
);

const legacy = `android {
  defaultConfig {
    versionCode 7
    versionName '1.2.3'
  }
}
`;

assert.deepEqual(readAndroidVersionMetadata(legacy), {
  versionCode: 7,
  versionName: '1.2.3',
});
assert.equal(
  updateAndroidVersionMetadata(legacy, {
    versionCode: 8,
    versionName: '1.2.4',
  }),
  `android {
  defaultConfig {
    versionCode 8
    versionName '1.2.4'
  }
}
`,
);

assert.throws(
  () => readAndroidVersionMetadata('versionCode = 1\n'),
  /versionName, found 0/,
);
assert.throws(
  () => readAndroidVersionMetadata(
    'versionCode = 1\nversionCode = 2\nversionName = "1.0.0"\n',
  ),
  /versionCode, found 2/,
);
assert.throws(
  () => updateAndroidVersionMetadata(assignment, {
    versionCode: 128,
    versionName: 'invalid',
  }),
  /Invalid Android versionName/,
);

const packageVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const repositoryAndroidVersion = readAndroidVersionMetadata(
  readFileSync('android/app/build.gradle', 'utf8'),
);

assert.equal(lock.version, packageVersion);
assert.equal(lock.packages[''].version, packageVersion);
assert.equal(repositoryAndroidVersion.versionName, packageVersion);

console.log('Android version metadata tests passed');