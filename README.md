# DA Bubble

## Description

DA Bubble is a Slack clone application built with Angular and Firebase, providing real-time messaging and collaboration features.

## Table of Contents

- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Usage](#usage)
- [Internationalization](#internationalization)
- [Security Guidelines](#security-guidelines)
- [License](#license)
- [Contact](#contact)

## Installation

```bash
# Clone the repository
git clone https://github.com/ttariik/DA-Bubble2479.git

# Navigate to project directory
cd DA-Bubble2479

# Install dependencies
npm install

# Start development server
ng serve
```

## Environment Setup

Create a `.env` file based on `.env.example` with the following variables:

```
FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
```

## Usage

1. Navigate to `http://localhost:4200` after starting the development server
2. Create an account or log in with existing credentials
3. Select a channel or start a direct message conversation
4. Use the sidebar to navigate between channels and direct messages

## Internationalization

DA Bubble supports multiple languages through ngx-translate integration.

### Supported Languages

| Code | Language | Flag |
|------|----------|------|
| DE   | Deutsch (German) | Default |
| EN   | English | |
| ES   | Espanol (Spanish) | |
| FR   | Francais (French) | |

### Language Selection

The language selector is located in the login header. Users can switch languages at any time:

1. Click the language button in the header (displays current language flag and code)
2. Select the desired language from the dropdown menu
3. The entire application interface updates immediately

### Language Persistence

- Selected language is stored in `localStorage`
- Preference persists across browser sessions
- On first visit, the application attempts to detect browser language
- Falls back to German (DE) if browser language is not supported

### Translation Files

Translation files are located in `src/assets/i18n/`:

```
src/assets/i18n/
  de.json    # German translations (default)
  en.json    # English translations
  es.json    # Spanish translations
  fr.json    # French translations
```

### Adding New Translations

To add translations for a new component:

1. Add translation keys to all language files in `src/assets/i18n/`
2. Import `TranslateModule` in your component
3. Use the `translate` pipe in templates: `{{ 'KEY.SUBKEY' | translate }}`
4. For dynamic translations in TypeScript, inject `TranslateService` and use `instant()` or `get()`

Example template usage:

```html
<h1>{{ 'LOGIN.TITLE' | translate }}</h1>
<input [placeholder]="'LOGIN.EMAIL_PLACEHOLDER' | translate" />
```

Example TypeScript usage:

```typescript
import { TranslateService } from '@ngx-translate/core';

constructor(private translate: TranslateService) {}

getMessage(): string {
  return this.translate.instant('STATUS.ONLINE');
}
```

## Security Guidelines

- Never commit sensitive credentials or API keys
- Use environment variables for configuration
- Validate all user input on client and server side
- Follow principle of least privilege for Firebase rules

## License

This project is licensed under the MIT License.

## Contact

For questions or support, contact the development team.
