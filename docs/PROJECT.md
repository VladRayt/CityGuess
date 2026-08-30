# CityGuess — контекст проєкту

> Цей файл — «пам'ять проєкту» для людей і для AI-асистентів. Він автоматично підвантажується в Claude Code через `CLAUDE.md`. Тут — що ми будуємо, які рішення ухвалені й **чому**, який стан інфраструктури і як ми домовились працювати. Оновлюй його, коли змінюється рішення, а не лише код.
>
> Актуальний стан: 2026-08-30. Ігровий код ще не писався — готова інфраструктура, стек і акаунти сервісів.

## 1. Продукт (v1)

**Одне речення:** щоденна гра-дедукція — вгадай місто по 360°-панорамі за 5 спроб, де кожна помилка наближає тебе через відстань і напрямок.

- **Щоденний ритуал.** Щодня — три нові міста: легке / середнє / важке. Одна сесія 3–5 хвилин. Усі гравці світу грають ті самі міста того самого дня (ключ дня — локальна дата; розклад міст — датований JSON на N днів уперед, щоб опівнічна зміна не залежала від сервера). Пропустив день — міста «згоріли» (архів — у преміумі).
- **Раунд.** Панорама міста. Вводиш назву (автокомпліт будь-якою мовою — GeoNames alt names). Помилка = інформація: «1 850 км ↗» + колір близькості. З кожною спробою — нова зачіпка. П'ять спроб. Провалив — місто відкривається з коротким фактом.
- **Правило правильної відповіді:** збіг GeoNames ID **або** haversine ≤ 30 км від центру (передмістя зараховано, сусіднє місто-суперник — ні).
- **Емоційна дуга:** легке — впевненість і стрік; середнє — «я молодець»; важке — тріумф або «завтра відіграюсь». Гра ніколи не закінчується поразкою.
- **Прогресія:** стрік по легкому місту (для всіх) + окремий hard-стрік; особиста статистика; мапа «мій вгаданий світ»; глобальна цифра дня («важке вгадали лише 11 %»).
- **Віральність:** картка-результат (шлях наближення кольорами, без спойлерів, номер дня) + «виклик другу» (лінк, друг грає ті самі міста, порівняння результатів).
- **Монетизація:** безкоштовно — сьогоднішні 3 міста з рекламою; rewarded-відео = шоста спроба, коли на кону стрік; преміум $1.99/міс або $14.99 lifetime — архів, без реклами, повна статистика, тематичні паки.
- **Тон:** тепла, атмосферна, трохи азартна гра для людей, що люблять подорожі. Фото живі, не листівки. Провал — з гумором.
- **Свідомо НЕМАЄ у v1:** real-time дуелей, лідербордів із незнайомцями, ліг/рейтингів, соцлогіну, кастомних режимів.
- **Критерій успіху v1:** retention D7 і кількість шерів на юзера, не інстали.
- **Мова UI:** English, але всі рядки через i18next з першого дня (українська додається одним JSON).

### Відкриті продуктові питання
- **Драбинка підказок по 5 спробах** (визначає контракт даних міста: скільки панорам/фото на місто). Варіанти: (а) панорама → друга панорама → регіон → деталь вулиці → перша літера; (б) лише відстань+напрямок; (в) без другої панорами. Не вирішено — спитати, коли почнемо дизайн ядра.
- Джерело й курація контенту (панорами): Mapillary + Wikimedia Commons як офлайн-пайплайн; ліцензія CC BY-SA → потрібна атрибуція в апці. Контентний тест на 20–30 містах ще не робився.

## 2. Ключові рішення і чому

| Рішення | Чому |
|---|---|
| **Панорами 360° — must-have для v1** (не статичні фото) | Рішення власника продукту. Спайк довів, що рендер у Skia працює (див. §5). Ризик — контент, а не технологія. |
| **Skia (`@shopify/react-native-skia`), не expo-gl + three.js** | Еквіректангулярне мапування — один SkSL-шейдер (~15 рядків); uniforms напряму з Reanimated shared values; той самий пакет малює картку-результат офскрін; краще підтримується. |
| **Firebase через CocoaPods + static frameworks, не SPM** | RNFB v26 за замовчуванням тягне Firebase через SPM і потребує dynamic frameworks. Але precompiled-модулі Expo 57 примусово роблять **static** усі поди, залежні від React-Core (95 подів, включно з RNFB і AdMob) — SPM-продукти не долітають до лінковки апки (undefined `_APM*`, `_FIRFirestoreErrorDomain`). Документований обхід: `disableSPM: true` + `useFrameworks: "static"` + `forceStaticLinking` для всіх `RNFB*`. Працює. Firebase припиняє публікацію в CocoaPods після жовтня 2026 — переглянути тоді (варіанти: `usePrecompiledModules: false`, або Supabase). |
| **Crashlytics, не Sentry** | Рішення власника: один вендор (Firebase). |
| **AppsFlyer замість Branch** | Один SDK закриває і deferred deep linking для «виклик другу» (OneLink), і атрибуцію інвайтів (share → click → install → play — це наш критерій успіху), і майбутню платну UA. Два SDK для діплінків не потрібні. |
| **Customer.io — не у v1** | Локальні пуші закривають стрік/нові міста; єдиний серверний пуш («% вгадали») — одна Cloud Function + Expo Push. Немає безкоштовного тарифу. Переглянути у v2. |
| **Amplitude** | Продуктова аналітика (воронка спроб, retention). Проєкт у **EU** дата-центрі → `serverZone: 'EU'` обов'язково. Firebase Analytics вимкнено. |
| **AdMob rewarded** | «Шоста спроба» — момент, коли рекламу дивляться з вдячністю. Потрібні ATT (iOS) і UMP-консент (GDPR). |
| **RevenueCat** | Підписка + lifetime без власного бекенду для чеків. |
| **MMKV 4 (Nitro) + Zustand** | Локальний стор (стрік, історія) і стейт. Альтернатива `expo-sqlite/kv-store` розглядалась — залишили MMKV за вибором власника. |
| **GeoNames cities15000** | ~31 тис. міст із колонкою `alternatenames` → офлайн-препроцес у компактний індекс (~3–5 МБ), автокомпліт і haversine локально, без API. |
| **Нативні `ios/` та `android/` закомічені (non-CNG)** | Вибір власника: папки мають бути в проєкті. Ціна: після змін в `app.json`/плагінів — `npx expo prebuild --clean`; `expo-doctor` показує інформаційне зауваження про non-CNG (це очікувано). |
| **Ключі сервісів як `EXPO_PUBLIC_*` у `.env` + EAS env** | Це клієнтські ключі (інлайняться в бандл), не секрети; `.env` не в git, є `.env.example`; для хмарних білдів — EAS environment variables у трьох середовищах. Секрети пайплайну (Mapillary) — без `EXPO_PUBLIC_`, не в EAS. |

## 3. Стек

Expo SDK 57 · React Native 0.86 · React 19.2 · New Architecture · Hermes · expo-router · React Compiler (`experiments.reactCompiler`) · TypeScript strict · Yarn 1 · dev build (`expo-dev-client`, Expo Go не підтримується).

| Пакет | Для чого | Примітки |
|---|---|---|
| `@shopify/react-native-skia` 2.11.1 | панорама (шейдер), картка-результат, ефекти | ставити **явно** ≥ 2.6.4: bundled Expo-версія 2.6.2 ламається зі static frameworks; версія захищена через `expo.install.exclude` |
| `react-native-reanimated` 4 + `react-native-worklets`, `react-native-gesture-handler` | жести панорами, анімації | з React Compiler використовувати `.get()/.set()` на shared values, не `.value` |
| `expo-sensors` | гіроскоп для панорами | `DeviceMotion.rotation`: alpha = yaw, beta = pitch, у радіанах |
| `@react-native-firebase/{app,auth,firestore,remote-config,analytics,storage,crashlytics}` 26.x | anonymous identity, статистика дня, челенджі, розклад/фіче-флаги, панорами, креші | CocoaPods/static — див. §2; `analytics` з `ios.withoutAdIdSupport: true` |
| `react-native-google-mobile-ads` 16.x | rewarded video | реальні App ID в `app.json`; у dev-збірках запити з `TestIds`; GMA SDK 25.4 зібраний Kotlin 2.3 → див. §4 |
| `expo-tracking-transparency` | ATT-промпт | запитувати до `AppsFlyer.init()` |
| `react-native-purchases` 10.x | RevenueCat | без config-плагіна; iOS потребує In-App Purchase capability |
| `react-native-appsflyer` 7.x | OneLink, атрибуція | API 7.x: `init` → `registerDeepLinkListener` (до init) → `start` у `registerSessionReadyListener`; `onDeepLink`/`initSdk` з 6.x не існують |
| `react-native-mmkv` 4 + `react-native-nitro-modules` | локальний стор | Nitro Modules — окрема нативна залежність |
| `@amplitude/analytics-react-native` + `@react-native-async-storage/async-storage` | аналітика | async-storage — один екземпляр 2.2.0 через yarn `resolutions` (Amplitude тягне вкладений 1.x) |
| `react-native-view-shot` 5.1.1 | скріншот картки (fallback до Skia snapshot) | 5.1.1 — фікс bridgeless-режиму; захищено `expo.install.exclude` |
| `expo-notifications` | локальні пуші | плагін лише з `color` |
| `expo-sharing`, `expo-haptics`, `expo-store-review`, `expo-localization`, `expo-file-system` | шеринг, вібро, оцінка, локаль, кеш | `expo-sharing` без плагіна (плагін — для *приймання* шерів) |
| `zustand`, `i18next`, `react-i18next` | стейт, локалізація | JS-only |
| dev: `jest-expo`, `jest`, `@types/jest`, `eslint-config-expo` | тести логіки, лінт | `yarn test`, `yarn lint`, `yarn compile` |

## 4. Toolchain, білди і гочі (обов'язково прочитати перед нативними змінами)

- **Xcode ≥ 26.4** — вимога Expo SDK 57 (таблиця на docs.expo.dev/versions/v57.0.0/). На машині — Xcode 26.6 / Swift 6.3.3. З Xcode 26.2 `expo-modules-jsi` не компілювався (`SWIFT_RETURNS_RETAINED` на конструкторах); патч, який це обходив, видалено після апдейту Xcode. **Перевіряй `xcodebuild -version` першим, якщо падає нативний білд.**
- **Kotlin 2.2.21** (`expo-build-properties.android.kotlinVersion`) + локальний плагін **`plugins/with-android-kotlin.js`**. Сама властивість міняє лише каталог Expo (`ext.kotlinVersion`); root `classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')` без версії резолвиться в RN-ський 2.1.20, і компілятор лишається старим. Плагін пінить classpath до `android.kotlinVersion` і задає `ext.kotlin_stdlib_version = ext.kotlinVersion` (AppsFlyer інакше тягне stdlib 2.4.10). Причина бампа: `play-services-ads 25.4.0` має метадані Kotlin 2.3.0. Перевірка: `cd android && ./gradlew buildEnvironment | grep kotlin-gradle-plugin` → `2.1.20 -> 2.2.21`.
- **Після кожного `yarn install`/`yarn add` — `npx pod-install`.** Подспек Skia копіює прекомпільовані xcframework-и в `node_modules/@shopify/react-native-skia/libs/ios/` під час pod install; yarn їх стирає, і Xcode падає в `[CP] Copy XCFrameworks`.
- **Не запускати два білди одного проєкту одночасно** (`expo run:ios` + чужий `xcodebuild`) — спільний DerivedData → `database is locked`. Перед білдом: `pgrep xcodebuild`.
- **Metro з `CI=1` вимикає file watcher** → застарілі бандли. Для dev-сервера не ставити `CI=1`.
- **Порт 8081** може тримати паралельний `expo run:ios` власника; для другого Metro — `--port 8082`, але `--port` і `--no-bundler` взаємовиключні.
- **Prebuild копіює** `GoogleService-Info.plist` → `ios/CityGuess/`, `google-services.json` → `android/app/`. Після оновлення кореневих файлів — `prebuild --clean` або скопіювати вручну.
- **Firebase Installations валідує plist:** API key рівно 39 символів, починається з `A`, лише `[A-Za-z0-9_-]`; інакше апка падає на старті з `com.firebase.installations`.
- **Логи EAS:** `eas build:view <id> --json` → `logFiles[0]` — brotli-стиснутий JSON-lines; розпаковувати `zlib.brotliDecompressSync`, фільтрувати `phase === 'RUN_GRADLEW'`.
- Локальний Android release: `cd android && ./gradlew :app:bundleRelease --continue --no-daemon` (~10–35 хв, збирає всі 4 ABI).
- Контрольний iOS-білд: `CI=1 npx expo run:ios --no-bundler` (Metro не запускає; при встановленому dev-client запуск через `exp+cityguess://` іноді дає LaunchServices 115 — запустити апку `xcrun simctl launch booted com.vladrayt.cityguess`).

## 5. Що вже перевірено спайками (гілка `worktree-spike-panorama-native`, throwaway)

- **Панорама в Skia працює:** `src/spike/panorama-view.tsx` — SkSL еквіректангулярний шейдер (`Shader` + дочірній `ImageShader` з `fit="none"`, `tx="repeat"`, `ty="clamp"`), uniforms через `useDerivedValue`, pan/pinch, `DeviceMotion`. Рендер коректний на симуляторі з JPEG 3840×1920. Потрібен `GestureHandlerRootView` у корені. Не зміряно: FPS і осі гіроскопа на реальному девайсі, шов на yaw = π.
- **Весь нативний набір збирається** на iOS (Xcode 26.6) і Android (EAS build `07ab6cd0` FINISHED) — після фіксів із §2 (Firebase static) і §4 (Kotlin).

## 6. Інфраструктура і акаунти

| Сервіс | Стан | Ідентифікатори / де лежить |
|---|---|---|
| GitHub | `VladRayt/CityGuess`, гілка `main` | push через ssh-алiас `github.com-vlad` |
| EAS | ✅ `@vlad25032004/CityGuess`, id `929101b9-fb57-48d6-852e-9f148f06c60b`; профілі development (сим), development-device, preview, production; Android keystore в EAS | `eas.json`; env vars у трьох середовищах |
| Firebase | ✅ проєкт `cityguess-4a8f0` (Blaze, Individual billing); Anonymous Auth, Firestore, Remote Config, Storage `gs://cityguess-4a8f0.firebasestorage.app` (US-EAST1, no-cost) | реальні `GoogleService-Info.plist`, `google-services.json` у корені + нативні копії |
| AdMob | ✅ акаунт `ca-app-pub-5468388035026396`; App ID Android `~4674435655`, iOS `~8422108972`; Rewarded `sixth_attempt`: Android `/4322092182`, iOS `/2055021499`. ⏳ прив'язка стору + `app-ads.txt` після публікації; акаунт на перевірці | App ID — `app.json`; unit ID — `EXPO_PUBLIC_ADMOB_REWARDED_ANDROID/_IOS` |
| AppsFlyer | ✅ Android-апка (pending), Dev Key; ⏳ iOS-апка (потрібен реальний App Store ID — **не dummy**), OneLink template | `EXPO_PUBLIC_APPSFLYER_DEV_KEY` |
| Amplitude | ✅ org `long-bar-429391`, **EU** | `EXPO_PUBLIC_AMPLITUDE_API_KEY`, `EXPO_PUBLIC_AMPLITUDE_SERVER_ZONE=EU` |
| Mapillary | ✅ app `CityGuess` (id 28206393472360376), токен для пайплайну | `MAPILLARY_ACCESS_TOKEN` (лише `.env`) |
| Apple Developer | ⏳ оплачено, на перевірці | після: App Store Connect апка, Apple ID (numeric), Team ID, ASC API key |
| Google Play | ⏳ оплачено, на перевірці; акаунт особистий → **closed testing ≥ 12 тестерів 14 днів** до production | після: Create app (Game, Free) → Internal testing з `.aab` `07ab6cd0` → API access service account → merchant profile |
| RevenueCat | ⏳ після обох сторів | продукти `premium_monthly` $1.99, `premium_lifetime` $14.99; entitlement `premium` |

Bundle id / package: `com.vladrayt.cityguess`. Тестові AdMob ID Google більше не використовуються в `app.json`.

## 7. Стан коду

- `src/` — каркас з шаблону Expo: `app/_layout.tsx` (ThemeProvider + NativeTabs), `app/index.tsx` (заглушка Home), `components/` (`ThemedText`, `ThemedView`, `app-tabs`, `external-link`, `ui/collapsible`), `constants/theme.ts`, `hooks/`. Ігрової логіки, екранів, i18n, тестів — **ще немає**.
- Референс панорами — у гілці спайку (`.claude/worktrees/spike-panorama-native`, файл `src/spike/panorama-view.tsx`), у `main` не перенесений (перенести під час дизайну ядра, з урахуванням `.get()/.set()`).
- `plugins/with-android-kotlin.js` — єдиний локальний config-плагін.

## 8. Погоджений порядок робіт

1. ✅ Спайки: панорама в Skia; нативна сумісність стеку (iOS + Android).
2. ✅ Інфраструктура: залежності в `main`, акаунти й ключі (крім заблокованих сторами).
3. ⏳ Стори: Apple / Google → RevenueCat → iOS у AppsFlyer + OneLink.
4. **Дизайн ядра гри** (ще не починали; власник вирішує, коли): контракт даних міста, драбинка підказок, екрани Home / Round / Result / Stats, GeoNames-індекс, логіка відстані/напрямку/кольору, стріки. TDD для ігрової логіки (haversine, bearing, парсинг введення, стріки).
5. Ядро офлайн (без бекенду) → Firebase (статистика дня, челенджі, Remote Config) → шеринг + AppsFlyer → монетизація (RevenueCat, AdMob) → аналітика/пуші → контент-пайплайн (Mapillary/Commons, атрибуція, CDN для панорам).

## 9. Як ми працюємо (домовленості з власником)

- **Крок за кроком, у межах поставленої задачі.** Власник явно скоупить кроки («лише залежності встановити»); не тягнути в наступну фазу без запиту, не ставити дизайн-питання, поки не попросять.
- **Блокери — одразу окремим повідомленням.** Якщо знайдено вимогу середовища (як Xcode 26.4+) або структурну проблему — сказати відразу, а не ховати в статусі.
- **Спочатку вимоги toolchain, потім дебаг залежностей.** При нативних помилках першим перевіряти таблицю вимог Expo SDK (Xcode, Kotlin/AGP).
- **Докази перед твердженнями:** lint, `tsc`, `expo-doctor`, реальний білд (`expo run:ios` / `gradlew bundleRelease` / EAS) перед комітом; у коміт-меседжі — що саме перевірено.
- **Мова спілкування — українська**; ідентифікатори/коди — як є. Коміти — англійською, з `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- **Секрети не в чат і не в git:** файли ключів — у корінь репо (додати в `.gitignore`) або EAS credentials.
- Читати офіційні доки Expo SDK 57 (`https://docs.expo.dev/versions/v57.0.0/`) перед написанням коду — вимога `AGENTS.md`.
