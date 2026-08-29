# CityGuess

Мобільна гра на [Expo](https://expo.dev) SDK 57 / Expo Router.

## Запуск

```bash
nvm use          # Node з .nvmrc
yarn install
yarn start       # Metro + Expo Dev Server (i — iOS, a — Android, w — web)
```

Нативний білд і запуск на симуляторі/емуляторі (перший раз довго, далі інкрементально):

```bash
yarn ios         # expo run:ios
yarn android     # expo run:android
yarn web         # expo start --web
```

Нативні проєкти лежать у `ios/` та `android/`. Після змін в `app.json` або списку config-плагінів перегенеруй їх:

```bash
npx expo prebuild --clean
```

## Скрипти

| Команда | Що робить |
|---|---|
| `yarn lint` | ESLint (`eslint-config-expo`) |
| `yarn compile` | Перевірка типів `tsc --noEmit` |
| `yarn doctor` | `expo-doctor` — перевірка сумісності залежностей |
| `yarn test` | Jest (`jest-expo`) — тести ігрової логіки |

## Стек (нативні модулі)

Проєкт — dev build (`expo-dev-client`), Expo Go не підтримується. Нативні залежності та їх конфіг-плагіни в `app.json`:

| Бібліотека | Для чого | Примітки |
|---|---|---|
| `@shopify/react-native-skia` 2.11.1 | 360° панорами (шейдер), картка-результат | ставити явно ≥ 2.6.4 |
| `expo-sensors` | гіроскоп для панорами (`DeviceMotion`) | `NSMotionUsageDescription` через плагін |
| `react-native-google-mobile-ads` | rewarded video («6-та спроба») | реальні App ID в `app.json` (акаунт `ca-app-pub-5468388035026396`); у dev-збірках запити реклами робити з `TestIds`; GMA SDK 25.4 зібраний Kotlin 2.3 → проєкт на Kotlin **2.2.21**: `expo-build-properties.android.kotlinVersion` + `plugins/with-android-kotlin.js` (пінить KGP на root-classpath — сама властивість міняє лише каталог Expo, компілятор лишався б 2.1.20) |
| `expo-tracking-transparency` | ATT-промпт (AdMob, AppsFlyer) | |
| `react-native-purchases` | RevenueCat: підписка / lifetime | без плагіна; увімкнути In-App Purchase capability |
| `react-native-appsflyer` 7.x | OneLink діплінки «виклик другу», атрибуція | API 7.x: `init`/`start`/`registerDeepLinkListener`; ATT запитувати до `init()`. Android: локальний плагін `plugins/with-android-kotlin.js` пінить `kotlin_stdlib_version` до Kotlin проєкту (інакше модуль тягне stdlib 2.4.x і `compileReleaseKotlin` падає) |
| `react-native-mmkv` 4 + `react-native-nitro-modules` | локальний стор (стрік, історія) | |
| `@amplitude/analytics-react-native` | продуктова аналітика | потребує `@react-native-async-storage/async-storage` |
| `react-native-view-shot` 5.1.1 | скріншот картки-результату | |
| `expo-notifications` | локальні пуші (стрік, нові міста) | |
| `expo-sharing`, `expo-haptics`, `expo-store-review`, `expo-localization`, `expo-file-system` | шеринг, вібро, оцінка, локаль, кеш файлів | |
| `zustand`, `i18next` + `react-i18next` | стейт, локалізація (UI — English, каркас i18n) | JS-only |

### Firebase

`@react-native-firebase/{app,auth,firestore,remote-config,analytics,storage,crashlytics}` підключено **через CocoaPods**, не через SPM: плагін `@react-native-firebase/app` має `ios.disableSPM: true`, а `expo-build-properties` — `useFrameworks: "static"` + `forceStaticLinking` для всіх `RNFB*`-подів. Причина: precompiled-модулі Expo 57 роблять усі React-Core-залежні поди статичними, і SPM-режим RNFB v26 (dynamic frameworks) не лінкується. Analytics — з `ios.withoutAdIdSupport: true` (без IDFA; продуктова аналітика — в Amplitude).

`GoogleService-Info.plist` і `google-services.json` у корені — реальні файли Firebase-проєкту `cityguess-4a8f0` (iOS bundle id і Android package — `com.vladrayt.cityguess`). Їх копії живуть у `ios/CityGuess/` та `android/app/` — після оновлення файлів у корені або запусти `npx expo prebuild --clean`, або скопіюй їх туди вручну. Google Analytics для Firebase вимкнено (`IS_ANALYTICS_ENABLED = false`) — продуктова аналітика йде в Amplitude.

## Ключі та env

Клієнтські ключі сервісів (AppsFlyer Dev Key, згодом RevenueCat/Amplitude/AdMob unit IDs) — це `EXPO_PUBLIC_*`-змінні: вони інлайняться в JS-бандл, тому не є секретами, але в git не комітяться.

- Локально: `.env` (ігнорується git) — скопіюй `.env.example` → `.env` і заповни.
- Хмарні білди: ті самі змінні лежать в EAS environment variables проєкту `@vlad25032004/CityGuess` для `development` / `preview` / `production` (`eas env:list --environment <env>`; оновити — `eas env:update`). Підтягнути локально: `eas env:pull --environment development`.
- Build-time ідентифікатори (AdMob App ID, bundle id, Firebase-файли) живуть в `app.json` та конфіг-файлах, не в env.

| Змінна | Сервіс |
|---|---|
| `EXPO_PUBLIC_APPSFLYER_DEV_KEY` | AppsFlyer Dev Key (один на акаунт) |
| `EXPO_PUBLIC_AMPLITUDE_API_KEY` | Amplitude project API key (org `long-bar-429391`, **EU** data center) |
| `EXPO_PUBLIC_AMPLITUDE_SERVER_ZONE` | `EU` — передається в `init(..., { serverZone })`; без цього події підуть у US і загубляться |

Секрети **пайплайну контенту** (скрипти курації, не апка) — теж у `.env`, але **без** `EXPO_PUBLIC_` і не в EAS:

| Змінна | Сервіс |
|---|---|
| `MAPILLARY_ACCESS_TOKEN` | Mapillary API v4 client token (`MLY\|…`), app `CityGuess` (id 28206393472360376) — пошук/завантаження панорам |

## Структура

- `src/app/` — екрани та layout (file-based routing)
- `src/components/` — UI-компоненти (`ThemedText`, `ThemedView`, таби)
- `src/constants/theme.ts` — кольори, шрифти, відступи
- `src/hooks/` — `useTheme`, `useColorScheme`
- `assets/images/` — іконки та splash
