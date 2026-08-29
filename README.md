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

## Структура

- `src/app/` — екрани та layout (file-based routing)
- `src/components/` — UI-компоненти (`ThemedText`, `ThemedView`, таби)
- `src/constants/theme.ts` — кольори, шрифти, відступи
- `src/hooks/` — `useTheme`, `useColorScheme`
- `assets/images/` — іконки та splash
