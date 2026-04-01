# Campaign Oracle Frontend Guide

React frontend built with TanStack Router and TanStack Query.

## Technology Stack

| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework |
| **TanStack Router** | File-based routing |
| **TanStack Query** | Data fetching & caching |
| **Hono RPC Client** | Type-safe API calls |
| **Better Auth** | Authentication |
| **Tailwind CSS** | Styling |

---

## Directory Structure

```
apps/web/
├── app/
│   ├── routes/           # TanStack Router pages
│   │   ├── __root.tsx    # Root layout (sidebar, header)
│   │   ├── index.tsx     # Dashboard (/)
│   │   ├── party.tsx     # Party view (/party)
│   │   ├── quests.tsx    # Quests (/quests)
│   │   ├── sessions.tsx  # Sessions (/sessions)
│   │   ├── npcs.tsx      # NPCs (/npcs)
│   │   ├── items.tsx     # Items (/items)
│   │   ├── oracle.tsx    # AI Chat (/oracle)
│   │   ├── settings.tsx  # Settings (/settings)
│   │   ├── account.tsx   # Account (/account)
│   │   ├── usage.tsx     # Usage stats (/usage)
│   │   └── login.tsx     # Login page (/login)
│   ├── hooks/            # React Query hooks
│   ├── lib/              # Hono client, auth client
│   ├── contexts/         # React contexts
│   ├── services/         # API services
│   └── utils/            # Utilities
├── components/
│   ├── views/            # Page-level components
│   ├── ui/               # Reusable primitives (Button, Card, Badge)
│   └── layout/           # Layout components (Sidebar, Header)
├── contexts/
│   └── AuthContext.tsx   # Authentication state
└── types/
    └── index.ts          # TypeScript types
```

---

## Data Fetching

### Hono RPC Client

Type-safe API calls with full TypeScript inference:

```typescript
// app/lib/client.ts
import { hc } from 'hono/client'
import type { AppType } from '@campaign-oracle/api'

export const client = hc<AppType>('/api', { credentials: 'include' })

// Usage - types are inferred from API routes
const res = await client.api.campaigns.$get()
const campaigns = await res.json() // Fully typed!
```

### Query Keys Factory

Centralized query key management:

```typescript
// app/utils/queryKeys.ts
export const campaignKeys = {
    all: ['campaigns'] as const,
    lists: () => [...campaignKeys.all, 'list'] as const,
    detail: (id: string) => [...campaignKeys.all, 'detail', id] as const,
}
```

---

## Core Hooks

### `useCampaignData(campaignId)`

Fetches full campaign data with related entities.

**Returns:**
```typescript
{
  data: CampaignData | null     // Campaign with party, quests, sessions, NPCs, items
  isLoading: boolean
  isError: boolean
  error: Error | null
}
```

**Features:**
- Demo mode: Returns mock data when unauthenticated
- Auto-transforms API responses to frontend types
- Includes demo session data for November 2025

### `useCampaignMutations(campaignId)`

CRUD mutations for campaign entities.

**Returns:**
```typescript
{
  // Campaign
  updateCampaign: UseMutationResult

  // Quests
  addQuest: UseMutationResult
  updateQuest: UseMutationResult
  deleteQuest: UseMutationResult

  // NPCs
  addNpc: UseMutationResult
  updateNpc: UseMutationResult
  deleteNpc: UseMutationResult

  // Sessions
  addSession: UseMutationResult

  // State
  isDemo: boolean  // Mutations blocked in demo mode
}
```

### `useCampaigns()`

Lists all campaigns for the current user.

### `useSearch(query, campaignId)`

Searches campaign data via Vertex AI Search.

---

## Authentication

### `AuthContext`

Provides auth state throughout the app:

```typescript
const { user, isAuthenticated, isDemo, login, logout } = useAuth()
```

**Properties:**
- `user`: Current user object or null
- `isAuthenticated`: Boolean login state
- `isDemo`: True when viewing demo data
- `login()`: Triggers OAuth flow
- `logout()`: Signs out user

### Protected Routes

Routes check auth status in loaders:

```typescript
// app/routes/quests.tsx
export const Route = createFileRoute('/quests')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated && !context.auth.isDemo) {
      throw redirect({ to: '/login' })
    }
  },
})
```

---

## View Components

Page components in `components/views/`:

| Component | Route | Purpose |
|-----------|-------|---------|
| `DashboardView` | `/` | Campaign overview, stats |
| `PartyView` | `/party` | Character management |
| `QuestsView` | `/quests` | Quest tracking |
| `SessionsView` | `/sessions` | Session logs |
| `NPCsView` | `/npcs` | NPC management |
| `ItemsView` | `/items` | Inventory |
| `OracleView` | `/oracle` | AI chat interface |
| `SettingsView` | `/settings` | App settings |
| `AccountView` | `/account` | User profile |
| `UsageView` | `/usage` | API usage stats |

### Expandable Cards

Interactive cards with edit/delete functionality:

- `ExpandableCharacterCard` - Full character sheet
- `ExpandableQuestCard` - Quest details + status
- `ExpandableSessionCard` - Session journal
- `SessionSummaryCard` - AI-generated summaries

---

## State Patterns

### Query Invalidation

Mutations auto-invalidate related queries:

```typescript
const addQuest = useMutation({
  mutationFn: async (quest) => { /* ... */ },
  onSuccess: () => {
    queryClient.invalidateQueries({ 
      queryKey: campaignKeys.detail(campaignId) 
    })
  },
})
```

### Optimistic Updates

For instant UI feedback:

```typescript
const updateQuest = useMutation({
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey })
    const previous = queryClient.getQueryData(queryKey)
    queryClient.setQueryData(queryKey, (old) => ({ ...old, ...newData }))
    return { previous }
  },
  onError: (_, __, context) => {
    queryClient.setQueryData(queryKey, context?.previous)
  },
})
```

---

## Demo Mode

Unauthenticated users see demo data:

1. `AuthContext` provides `isDemo: true`
2. `useCampaignData` returns mock `DEMO_CAMPAIGN_DATA`
3. `useCampaignMutations` blocks changes with error messages
4. Demo session logs in `demoSessions.ts`

Access demo mode by clicking **"Demo"** on login page.
