# Contributing to Logto Dash

Thank you for your interest in contributing to Logto Dash! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js 18+
- npm, pnpm, or yarn
- A Logto instance (cloud or self-hosted) for testing

### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/logto-components-next.git
   cd logto-components-next
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy `.env.example` to `.env` and configure your Logto credentials:
   ```bash
   cp .env.example .env
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

### Environment Configuration

See the README.md for detailed environment variable configuration. At minimum, you need:

```env
APP_ID=your-app-id
APP_SECRET=your-app-secret
ENDPOINT=https://your-tenant.logto.app
BASE_URL=http://localhost:3000
COOKIE_SECRET=your-random-secret
SCOPES=openid,profile,custom_data,email,phone,identities,sessions
```

## Pull Request Process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the code style guidelines below

3. Test your changes locally:
   ```bash
   npm run dev
   ```
   Verify all affected features work correctly

4. Commit your changes with clear, descriptive messages:
   ```bash
   git commit -m "feat: add new feature description"
   ```

5. Push to your fork and open a Pull Request against `main`

6. Ensure your PR:
   - Has a clear description of changes
   - References any related issues
   - Does not break existing functionality

## Code Style Guidelines

### TypeScript

- Use strict TypeScript mode (already configured in `tsconfig.json`)
- Prefer explicit types over `any` where possible
- Use interfaces for object shapes, types for unions/primitives
- Keep type definitions co-located with their usage or in nearby `types.ts` files

### React

- Use Server Components by default (Next.js App Router)
- Only use `'use client'` directive when client-side interactivity is needed
- Prefer composition over inheritance
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks

### File Organization

```
app/
├── api/           # API routes
├── logto-kit/     # Core library components
│   ├── components/    # React components
│   ├── logic/         # Business logic and utilities
│   ├── themes/        # Theme definitions
│   └── locales/       # i18n translations
```

### Naming Conventions

- **Files**: kebab-case for files (`user-button.tsx`, `session-tracker.ts`)
- **Components**: PascalCase (`UserButton`, `Dashboard`)
- **Functions**: camelCase (`getUserData`, `validateToken`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_RETRIES`, `DEFAULT_TIMEOUT`)
- **Types/Interfaces**: PascalCase (`UserData`, `ThemeSpec`)

### CSS & Styling

- Use CSS custom properties (variables) for theming
- Follow the existing theme structure in `app/logto-kit/themes/`
- Keep styles scoped to components where possible

## Running the Project

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Start production server
npm run start
```

## Testing Changes

There is currently no automated test suite. Please test manually:

1. **Authentication Flow**: Sign in, sign out, session persistence
2. **Dashboard**: All tabs load correctly, data displays properly
3. **Theme Switching**: Dark/light modes work correctly
4. **i18n**: Language switching works (if applicable)
5. **Avatar Upload**: Upload works with valid storage configuration (optional)
6. **Protected Components**: Permission gates work correctly (optional)

### Manual Testing Checklist

- [ ] Sign in works
- [ ] Sign out works
- [ ] Dashboard opens and closes
- [ ] Profile tab loads user data
- [ ] Preferences tab saves changes
- [ ] Theme toggle works
- [ ] Language switch works (if multiple languages configured)
- [ ] Sessions tab shows active sessions
- [ ] Dev tab shows tokens (when `DEBUG=true`)

## Reporting Issues

When reporting issues, please include:

1. Node.js version
2. Browser and version
3. Steps to reproduce
4. Expected behavior
5. Actual behavior
6. Relevant console errors or logs

## Questions?

Open a GitHub issue with the `question` label or start a discussion in the Discussions tab.

---

Thank you for contributing to Logto Dash!
