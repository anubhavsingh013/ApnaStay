# ApnaStay

**Your Home Your Way** - A trusted platform for finding the perfect rental home.

## Getting Started

### Prerequisites

- Node.js & npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Development

```sh
# Install dependencies
npm i

# Start the development server with auto-reloading
npm run dev
```

### Build

```sh
npm run build
```

### Preview Production Build

```sh
npm run preview
```

## Project Structure

```
src/
├── assets/              # Images, fonts
├── components/
│   ├── ui/              # shadcn/ui primitives (kebab-case)
│   ├── layout/          # Navbar, Footer, ScrollToTop, PageTransition, ProtectedRoute
│   ├── common/          # ApnaStayLogo, SectionTitle, StatsCard, NavLink, DatePickerSelects, StatusFilterDropdown
│   ├── property/        # PropertyCard, FilterSidebar, SearchBar
│   └── auth/            # TwoFactorBadge, TwoFactorSettings, VerificationBadge, MobileInput
├── features/
│   └── demo/            # DemoDataContext, DemoRoleSwitcher, DemoModePopup, DemoModeLoginPrompt
├── pages/               # Route-level page components
├── hooks/               # Custom hooks (use-toast, use-mobile)
├── contexts/            # AuthContext
├── lib/                 # API client, utils
├── constants/           # indianStates, mockData, properties
└── test/                # Test setup
```

**Naming conventions:**
- Components: PascalCase (`PropertyCard.tsx`)
- Hooks: kebab-case (`use-toast.ts`)
- UI primitives: kebab-case (`dropdown-menu.tsx`)

## Tech Stack

- **Vite** - Build tool
- **TypeScript** - Type safety
- **React** - UI framework
- **shadcn-ui** - Component library
- **Tailwind CSS** - Styling
