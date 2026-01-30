# DA Bubble

A real-time messaging and collaboration platform inspired by Slack, built with Angular 18 and Firebase.

![Angular](https://img.shields.io/badge/Angular-18-DD0031?style=flat&logo=angular)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=flat&logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-12.7-FFCA28?style=flat&logo=firebase)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Internationalization](#internationalization)
- [Security Guidelines](#security-guidelines)
- [Developers](#developers)
- [License](#license)

## Features

### Authentication & User Management
- Email/password registration and login
- Google OAuth integration
- Password reset via email verification
- User profiles with customizable avatars
- Activity status tracking (online/away/offline)

### Channel Management
- Create and manage channels with descriptions
- Add/remove channel members
- Channel-based messaging with real-time updates

### Direct Messaging
- Private one-on-one conversations
- User search for initiating new conversations
- Separate conversation management

### Messaging Features
- Create, edit, and delete messages
- Threaded conversations (reply to specific messages)
- Emoji reactions (12 emoji options)
- @mentions for users and #channel references
- Rich text content formatting

### Search
- Real-time message search across channels and DMs
- User search functionality
- Live filtering as you type

### Multi-Language Support
- German (DE) - Default
- English (EN)
- Spanish (ES)
- French (FR)

### User Interface
- Responsive design with collapsible sidebar
- Avatar selection during signup (6 predefined options)
- User profile modals with status display
- Splash screen and intuitive navigation

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | Angular 18 (Standalone Components) |
| Language | TypeScript 5.4 |
| Backend | Firebase (Firestore, Auth, Storage) |
| State Management | RxJS 7.8 |
| Internationalization | @ngx-translate |
| Testing | Karma + Jasmine |

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

The application will be available at `http://localhost:4200`

## Environment Setup

Create a `.env` file based on `.env.example` with your Firebase configuration:

```
FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
```

## Usage

1. Start the development server with `ng serve`
2. Navigate to `http://localhost:4200`
3. Create an account or log in with existing credentials
4. Explore channels or start direct message conversations
5. Use the sidebar to navigate between channels and DMs

## Project Structure

```
src/
├── app/
│   ├── components/           # UI Components
│   │   ├── dashboard/        # Main app layout
│   │   ├── chat-window/      # Message display & composition
│   │   ├── sidebar/          # Navigation (channels/DMs)
│   │   ├── message-item/     # Individual message with reactions
│   │   ├── thread/           # Thread/reply view
│   │   ├── login/            # Authentication
│   │   ├── signup/           # Registration
│   │   └── header/           # Top navigation
│   ├── services/             # Business logic
│   │   ├── auth.service.ts           # Authentication
│   │   ├── user.service.ts           # User management
│   │   ├── message.service.ts        # Channel messages
│   │   ├── direct-message.service.ts # Direct messages
│   │   ├── channel.service.ts        # Channel management
│   │   ├── thread.service.ts         # Thread replies
│   │   └── search.service.ts         # Search functionality
│   ├── models/               # TypeScript interfaces
│   ├── guards/               # Route guards (auth)
│   └── environments/         # Firebase configuration
├── assets/
│   ├── avatars/              # Predefined avatar SVGs
│   ├── fonts/                # Nunito font family
│   └── i18n/                 # Translation files
└── styles/                   # Global styles
```

## Internationalization

Translation files are located in `src/assets/i18n/`:

| Language | File | Status |
|----------|------|--------|
| German | de.json | Default |
| English | en.json | Supported |
| Spanish | es.json | Supported |
| French | fr.json | Supported |

### Language Selection
- Access the language selector in the login header
- Preference is saved in localStorage and persists across sessions
- Falls back to browser language detection if supported

### Adding Translations

Use the `translate` pipe in templates:

```html
<h1>{{ 'LOGIN.TITLE' | translate }}</h1>
```

Or inject `TranslateService` in TypeScript:

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

## Developers

This project was developed by:

| Developer | GitHub |
|-----------|--------|
| Alex | [Alex-R298](https://github.com/Alex-R298) |
| Tarik | [ttariik](https://github.com/ttariik) |
| Dking | [dkingtran](https://github.com/dkingtran) |

## License

This project is licensed under the MIT License.
