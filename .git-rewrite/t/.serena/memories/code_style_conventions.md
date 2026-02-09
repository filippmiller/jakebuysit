# Code Style & Conventions

## TypeScript Configuration
- **Target**: ES2022
- **Module**: ESNext
- **Strict Mode**: Enabled
- **Unused Locals/Parameters**: Error
- **No Implicit Returns**: Enabled
- **No Fallthrough Cases**: Enabled

## Naming Conventions
- **Files**: kebab-case (e.g., `metric-card.tsx`)
- **Components**: PascalCase (e.g., `MetricCard`)
- **Functions**: camelCase (e.g., `fetchDashboardMetrics`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `MAX_OFFER_AMOUNT`)
- **Types/Interfaces**: PascalCase (e.g., `OfferData`, `AdminConfig`)

## Component Structure
```typescript
// Component file structure
import { ... } from '...'  // External imports
import { ... } from '@/...' // Internal imports
import type { ... } from '...' // Type imports

// Types/Interfaces
interface ComponentProps {
  ...
}

// Component
export function Component({ ...props }: ComponentProps) {
  // Hooks first
  // Logic
  // Return JSX
}
```

## API Client Patterns
- Use typed responses with Zod schemas
- Handle errors consistently
- Include JWT auth headers
- Retry logic for network failures

## Admin UI Principles
- **Function over form**: Prioritize speed and information density
- **Real-time**: Dashboard must feel live, not stale
- **Mobile-friendly**: Telegram integration for escalations
- **Audit everything**: Log all admin actions
- **Data density**: Show maximum relevant information per screen
