// Local Expo config plugin — makes `expo-build-properties.android.kotlinVersion` actually control
// the Kotlin compiler used for every Android module.
//
// Background (Expo SDK 57 / RN 0.86):
// 1. The generated root android/build.gradle declares `classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')`
//    without a version. Gradle resolves it transitively from the included `@react-native/gradle-plugin`
//    build, i.e. React Native's own Kotlin (2.1.20). Expo's `android.kotlinVersion` only rewrites the
//    `expoLibs` version catalog (→ `ext.kotlinVersion`), so the compiler on the classpath stays 2.1.20
//    while the build summary happily prints the new version. Binary deps compiled with newer Kotlin
//    (e.g. play-services-ads 25.4 → metadata 2.3.0) then fail with "Module was compiled with an
//    incompatible version of Kotlin". We pin the classpath to the same property.
// 2. react-native-appsflyer resolves its kotlin-stdlib via `safeExtGet('kotlin_stdlib_version', '2.4.10')`;
//    Expo defines `ext.kotlinVersion` but not `kotlin_stdlib_version`, so it pulls a stdlib newer than the
//    compiler. We pin it to `ext.kotlinVersion`.
const { withProjectBuildGradle } = require('expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

const CLASSPATH_MARKER = '// kotlin-gradle-plugin pinned by plugins/with-android-kotlin.js';
const VERSIONLESS_CLASSPATH = /^(\s*)classpath\((['"])org\.jetbrains\.kotlin:kotlin-gradle-plugin\2\)\s*$/m;
const PINNED_CLASSPATH = (indent) =>
  [
    `${indent}${CLASSPATH_MARKER}`,
    `${indent}def cityguessKotlinVersion = project.findProperty('android.kotlinVersion')`,
    `${indent}classpath(cityguessKotlinVersion ? "org.jetbrains.kotlin:kotlin-gradle-plugin:\${cityguessKotlinVersion}" : 'org.jetbrains.kotlin:kotlin-gradle-plugin')`,
  ].join('\n');

const STDLIB_TAG = 'cityguess-appsflyer-kotlin-stdlib';
const STDLIB_ANCHOR = /apply plugin: "expo-root-project"/;
const STDLIB_SNIPPET = [
  '// react-native-appsflyer reads rootProject.ext.kotlin_stdlib_version (fallback 2.4.10).',
  "// Keep it in lock-step with the project's Kotlin compiler (see plugins/with-android-kotlin.js).",
  'ext.kotlin_stdlib_version = ext.kotlinVersion',
].join('\n');

function pinKotlinGradlePlugin(contents) {
  if (contents.includes(CLASSPATH_MARKER)) {
    return contents;
  }
  const match = contents.match(VERSIONLESS_CLASSPATH);
  if (!match) {
    throw new Error(
      "with-android-kotlin: could not find `classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')` in android/build.gradle"
    );
  }
  return contents.replace(VERSIONLESS_CLASSPATH, PINNED_CLASSPATH(match[1]));
}

function pinAppsFlyerStdlib(contents) {
  const merged = mergeContents({
    tag: STDLIB_TAG,
    src: contents,
    newSrc: STDLIB_SNIPPET,
    anchor: STDLIB_ANCHOR,
    offset: 1,
    comment: '//',
  });
  if (!merged.contents.includes(STDLIB_TAG)) {
    throw new Error(
      'with-android-kotlin: anchor `apply plugin: "expo-root-project"` not found in android/build.gradle'
    );
  }
  return merged.contents;
}

module.exports = function withAndroidKotlin(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      throw new Error('with-android-kotlin: only Groovy android/build.gradle is supported');
    }
    let contents = config.modResults.contents;
    contents = pinKotlinGradlePlugin(contents);
    contents = pinAppsFlyerStdlib(contents);
    config.modResults.contents = contents;
    return config;
  });
};
