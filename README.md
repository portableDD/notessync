# NotesSync - Offline-First PWA Notes App

A modern, fully-featured Progressive Web App for managing notes with offline-first functionality and real-time cloud synchronization.

## Features

- **Offline-First Architecture**: Full functionality without internet connection
- **Real-time Cloud Sync**: Automatic synchronization with Supabase when online
- **IndexedDB Storage**: Fast, reliable local data persistence
- **Service Worker**: Background caching and sync capabilities
- **Conflict Resolution**: Smart handling of simultaneous edits
- **Search & Filter**: Full-text search with advanced filtering options
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **PWA Ready**: Installable on any device as a native app

## Tech Stack

- **Frontend**: Next.js 16 with React 19
- **Storage**: IndexedDB + Supabase PostgreSQL
- **Backend Services**: Supabase REST API
- **PWA**: Service Worker + Web App Manifest
- **UI Framework**: Tailwind CSS v4 + shadcn/ui
- **Type Safety**: TypeScript

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture

### IndexedDB Schema

```
Database: NotesSync
├── Store: notes
│   ├── Key Path: id
│   ├── Index: user_id (for querying user's notes)
│   ├── Index: synced (for filtering sync status)
│   └── Index: modified_at (for sorting by date)
└── Store: syncQueue
    ├── Key Path: id (auto-increment)
    └── Stores: { operation, note, timestamp }
```

### Sync Flow

1. **Local Changes**: All modifications are saved to IndexedDB immediately
2. **Queue Management**: Operations are added to syncQueue
3. **Online Detection**: App detects when connection is restored
4. **Conflict Check**: Before syncing, app checks for server-side changes
5. **Sync Execution**: Pending operations are sent to Supabase
6. **Status Update**: Notes marked as synced after successful upload
7. **Pull Updates**: App fetches latest changes from server

### Conflict Resolution

The app uses **local-wins** strategy by default:

- User's local changes take priority over server changes
- Prevents data loss from simultaneous edits
- Alternative strategies available: server-wins, merge, manual

## NPM Packages

### Core Dependencies

- `next@16`: React framework with server components
- `react@19`: UI library
- `typescript`: Type safety
- `tailwindcss@4`: Utility-first CSS framework

### UI & Components

- `@radix-ui/*`: Accessible component primitives
- `lucide-react`: Beautiful SVG icons
- `class-variance-authority`: Component variant management
- `clsx`: Conditional class names

### Storage & Sync

- `@supabase/ssr`: Supabase authentication and client
- IndexedDB (built-in browser API)

### Development

- `next-font`: Google Fonts optimization
- ESLint & Prettier: Code quality
- PostCSS: CSS processing

## Usage Guide

### Creating Notes

1. Click "New Note" in the sidebar
2. Enter title and content
3. Changes save automatically to IndexedDB
4. Click "Save" button to sync with server when online

### Searching & Filtering

1. Use the search bar to find notes by title or content
2. Click "Advanced Filters" for more options:
   - Filter by sync status (Synced/Pending)
   - Filter by date range
3. Results update in real-time

### Offline Usage

- All notes remain fully functional offline
- Changes are saved locally and queued for sync
- Sync status indicator shows "Offline - Changes saved locally"
- Automatic sync begins when connection restored

### Conflict Resolution

When a conflict is detected:

- Local version is preserved (local-wins strategy)
- User can manually review changes if needed
- Server version can be retrieved from sync logs

## Performance Optimizations

- **Service Worker Caching**: Static assets cached for instant load
- **IndexedDB Indexing**: Fast queries using indexes on user_id and modified_at
- **Pagination**: Notes loaded efficiently in manageable chunks
- **Lazy Loading**: Components load on-demand
- **Code Splitting**: Automatic splitting by Next.js

## Security

- Row-level security (RLS) enforced in Supabase
- User isolation via user_id field
- No sensitive data in localStorage
- HTTPS required in production
- Input validation and sanitization

## Browser Support

- Chrome/Edge: 90+
- Firefox: 88+
- Safari: 14+
- Mobile browsers (iOS Safari 14+, Chrome Android)

## Troubleshooting

### Notes not syncing

1. Check internet connection
2. Verify Supabase credentials in `.env.local`
3. Check browser console for error messages
4. Clear browser cache and reload

### Service Worker not updating

1. Go to DevTools > Application > Service Workers
2. Check "Update on reload" checkbox
3. Clear cache and hard refresh (Cmd/Ctrl + Shift + R)

### IndexedDB storage full

- NotesSync automatically manages storage quota
- Delete old notes to free up space
- Synced notes can be safely deleted

## License

MIT License - feel free to use this project for personal or commercial purposes.

