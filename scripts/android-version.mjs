const VERSION_CODE_PATTERN = /^([ \t]*versionCode)([ \t]+(?:=[ \t]*)?)(\d+)([ \t]*(?:\/\/.*)?)$/gm;
const VERSION_NAME_PATTERN = /^([ \t]*versionName)([ \t]+(?:=[ \t]*)?)(["'])([^"']+)\3([ \t]*(?:\/\/.*)?)$/gm;

const singleMatch = (content, pattern, field) => {
  const matches = [...content.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one Android ${field}, found ${matches.length}.`);
  }
  return matches[0];
};

export const readAndroidVersionMetadata = (content) => {
  const codeMatch = singleMatch(content, VERSION_CODE_PATTERN, 'versionCode');
  const nameMatch = singleMatch(content, VERSION_NAME_PATTERN, 'versionName');
  const versionCode = Number(codeMatch[3]);

  if (!Number.isSafeInteger(versionCode) || versionCode < 1) {
    throw new Error(`Invalid Android versionCode: ${codeMatch[3]}.`);
  }

  return {
    versionCode,
    versionName: nameMatch[4],
  };
};

export const updateAndroidVersionMetadata = (content, { versionCode, versionName }) => {
  readAndroidVersionMetadata(content);

  if (!Number.isSafeInteger(versionCode) || versionCode < 1) {
    throw new Error(`Invalid Android versionCode: ${versionCode}.`);
  }
  if (typeof versionName !== 'string' || !/^\d+\.\d+\.\d+$/.test(versionName)) {
    throw new Error(`Invalid Android versionName: ${versionName}.`);
  }

  const withVersionCode = content.replace(
    VERSION_CODE_PATTERN,
    (_match, property, separator, _currentCode, suffix) => (
      `${property}${separator}${versionCode}${suffix}`
    ),
  );

  return withVersionCode.replace(
    VERSION_NAME_PATTERN,
    (_match, property, separator, quote, _currentName, suffix) => (
      `${property}${separator}${quote}${versionName}${quote}${suffix}`
    ),
  );
};