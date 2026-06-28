// Deprecated migration helper.
// The former DPI-balanced-display locale migration was replaced by
// app-only minimum-width (smallestScreenWidthDp) strings in src/locales/*.ts.
// Keep this script as a safe no-op so running it cannot reintroduce old DPI wording.

console.log('add-dpi-locales: no-op; app-only minimum-width locales are already maintained in src/locales/*.ts');
