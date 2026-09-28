# ScrapWala

Smart doorstep scrap pickup and recycling service.

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Lucide React (icons)

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
cp .env.example .env.local
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Project Structure

```
ScrapWala/
├── app/              # App Router pages and layouts
│   ├── (public)/     # Public pages (route group)
│   ├── (auth)/       # Authentication pages (route group)
│   ├── pickup/       # Pickup workflow
│   ├── dashboard/    # Customer dashboard
│   ├── admin/        # Admin panel
│   └── api/          # API route handlers
├── components/       # Reusable UI components
│   ├── common/       # Shared components
│   ├── layout/       # Layout components
│   ├── home/         # Home page components
│   ├── pickup/       # Pickup workflow components
│   ├── dashboard/    # Dashboard components
│   └── admin/        # Admin components
├── lib/              # Utilities and helpers
│   ├── db/           # Database helpers
│   ├── auth/         # Authentication helpers
│   ├── validations/  # Validation schemas
│   ├── constants/    # Constants
│   └── utils/        # Utility functions
├── models/           # Database models
├── services/         # Business logic
├── store/            # Client-side state
├── types/            # TypeScript types
└── public/           # Static assets
    ├── images/
    ├── icons/
    └── logos/
```
