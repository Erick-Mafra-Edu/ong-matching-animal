# Project Admin Context

## Overview

The project uses a Next.js/React admin area under `src/frontend/app/admin` and a large client-side admin panel in `src/frontend/components/features/Admin/AdminPanel.tsx`.

## Stack and patterns

- Admin page shell: `src/frontend/app/admin/page.tsx`
- Wrapper with dynamic import: `src/frontend/app/admin/AdminPageWrapper.tsx`
- Main admin UI: `src/frontend/components/features/Admin/AdminPanel.tsx`
- Admin API helpers and resource metadata: `src/frontend/lib/admin.ts`
- Shared UI building blocks: `src/frontend/components/ui/*`

The admin panel is already config-driven. New resource screens should extend the resource metadata instead of inventing separate one-off flows.

## Resource model

The admin layer works with these resource families:

- `admin-users`
- `tutors`
- `animals`
- `animal-photos`
- `tutor-interessados`
- `calendar-events`
- `calendar-oauth-connections`
- `custom-fields`
- `onboarding-questions`
- `matching-rules`
- `service-configs`
- `ong-settings`

## Common field types

The admin panel already supports these field patterns:

- `text`
- `email`
- `password`
- `number`
- `boolean`
- `select`
- `textarea`
- `keyValue`
- `options`
- `slider`

Prefer these types and extend the config before building new custom controls.

## Form patterns to preserve

- Use defaults from the resource config.
- Keep create-only fields separate from edit-only behavior.
- Use helper text for format requirements and side effects.
- Keep destructive actions behind confirm dialogs.
- Keep long configuration blocks in modal or sectioned layouts.

## Visualization patterns to preserve

- Show a compact summary card or header first.
- Use searchable lists and compact metadata rows for browsing.
- Move full record editing into a dialog or dedicated panel when the list view is already crowded.
- Represent state with badges and short status labels.

## Checklist for new admin work

- Add or update the resource metadata.
- Update defaults and search fields.
- Reuse existing UI primitives.
- Keep the dark compact admin visual style.
- Validate loading, empty, error, and confirm states.
- Check keyboard focus and accessibility.

