# Tokamak DAO v2

## Design System Rules

When writing web components:
1. Always check existing components in `src/components/ui/` first
2. Reuse existing components whenever available
3. Create new components in `src/components/ui/` if not available
4. Follow existing patterns (CVA, forwardRef, TypeScript) when creating components

### Existing Components
- Button, IconButton
- Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- Input, Textarea, Label, HelperText
- Badge
- Avatar
- Progress
- Navigation, Sidebar
- StatCard, DelegateCard, ProposalCard

### Component Creation Rules
- Use TypeScript + forwardRef pattern
- Define variants with class-variance-authority (CVA)
- Use CSS variables (design tokens), no hardcoding
- Add JSDoc comments

## Code Style
- TypeScript strict mode
- ES modules (import/export)
- Tailwind CSS + CSS variables

## Commands
- `npm run dev` - Development server
- `npm run build` - Build
- `npm run lint` - Lint

## Contracts

- Foundry project: `contracts/`
- **Contract specification**: See `contracts/contract-spec.md` (required)
- `cd contracts && forge build` - Build
- `cd contracts && forge test` - Test

### Web App Development Notes
- Check parameters/return values in `contract-spec.md` before calling contract functions
- Verify event signatures when subscribing to events
- State-changing functions require transactions, view functions use call
