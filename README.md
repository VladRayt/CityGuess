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
| `react-native-google-mobile-ads` | rewarded video («6-та спроба») | в `app.json` — **тестові** App ID Google; замінити на свої перед релізом |
| `expo-tracking-transparency` | ATT-промпт (AdMob, AppsFlyer) | |
| `react-native-purchases` | RevenueCat: підписка / lifetime | без плагіна; увімкнути In-App Purchase capability |
| `react-native-appsflyer` 7.x | OneLink діплінки «виклик другу», атрибуція | API 7.x: `init`/`start`/`registerDeepLinkListener`; ATT запитувати до `init()` |
| `react-native-mmkv` 4 + `react-native-nitro-modules` | локальний стор (стрік, історія) | |
| `@amplitude/analytics-react-native` | продуктова аналітика | потребує `@react-native-async-storage/async-storage` |
| `react-native-view-shot` 5.1.1 | скріншот картки-результату | |
| `expo-notifications` | локальні пуші (стрік, нові міста) | |
| `expo-sharing`, `expo-haptics`, `expo-store-review`, `expo-localization`, `expo-file-system` | шеринг, вібро, оцінка, локаль, кеш файлів | |
| `zustand`, `i18next` + `react-i18next` | стейт, локалізація (UI — English, каркас i18n) | JS-only |

### Firebase

`@react-native-firebase/{app,auth,firestore,remote-config,analytics,storage,crashlytics}` підключено **через CocoaPods**, не через SPM: плагін `@react-native-firebase/app` має `ios.disableSPM: true`, а `expo-build-properties` — `useFrameworks: "static"` + `forceStaticLinking` для всіх `RNFB*`-подів. Причина: precompiled-модулі Expo 57 роблять усі React-Core-залежні поди статичними, і SPM-режим RNFB v26 (dynamic frameworks) не лінкується. Analytics — з `ios.withoutAdIdSupport: true` (без IDFA; продуктова аналітика — в Amplitude).

`GoogleService-Info.plist` і `google-services.json` у корені — **заглушки з валідним форматом**, щоб проєкт збирався. Перед реальним бекендом замінити на файли з Firebase console (bundle id / package `com.vladrayt.cityguess`) і перезапустити `npx expo prebuild --clean`.

## Структура

- `src/app/` — екрани та layout (file-based routing)
- `src/components/` — UI-компоненти (`ThemedText`, `ThemedView`, таби)
- `src/constants/theme.ts` — кольори, шрифти, відступи
- `src/hooks/` — `useTheme`, `useColorScheme`
- `assets/images/` — іконки та splash
