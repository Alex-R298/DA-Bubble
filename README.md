# DA Bubble

## Description

DA Bubble is a Slack clone application built with Angular and Firebase, providing real-time messaging and collaboration features.

## Table of Contents

- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Usage](#usage)
- [Security Guidelines](#security-guidelines)
- [License](#license)
- [Contact](#contact)

## Installation

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- Angular CLI (v18 or higher)

### Setup Steps

1. Clone the repository:
```bash
git clone <repository-url>
cd DA-Bubble2479
```

2. Install dependencies:
```bash
npm install
```

3. Install Angular CLI globally (if not already installed):
```bash
npm install -g @angular/cli
```

## Environment Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Configure Firebase credentials in `.env`:
   - Replace all `YOUR_*` placeholders with your actual Firebase project credentials
   - Obtain credentials from Firebase Console: https://console.firebase.google.com

3. Ensure `.env` is listed in `.gitignore` and never commit it to version control.

## Usage

### Development Server

Start the development server:
```bash
npm start
```

Navigate to `http://localhost:4200/` in your browser.

### Build for Production

Build the application for production:
```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

### Running Tests

Execute unit tests:
```bash
npm test
```

## Security Guidelines

- Never commit `.env` files or any files containing sensitive credentials
- Validate all user input before processing
- Implement proper authentication and authorization mechanisms
- Use Firebase Security Rules to protect database access
- Regularly update dependencies to patch security vulnerabilities
- Review and audit code changes before deployment

## License

[Specify your license here]

## Contact

[Specify contact information here]

