---
name: admin-panel-forms
description: Front-end admin panels and dense form UX for this project. Use when working in the project admin area, especially React/Next.js admin screens, config-driven CRUD flows, long forms, tables, dialogs, filters, validation, and data-heavy visualization.
---

# Admin Panel Forms

Use this skill for the project admin front-end and any screen that handles many fields or a lot of record data.

## Read first

Read [project-admin-context.md](references/project-admin-context.md) before changing admin screens or building new admin forms.

## Workflow

1. Find the existing resource config, field type, and data flow before adding new UI.
2. Prefer the config-driven admin pattern already used in the project over ad hoc screens.
3. When adding a new admin resource, update the resource list, defaults, search fields, and display summaries together.
4. Keep the admin shell client-side only when needed and preserve the existing dynamic import and flag-gated pattern.

## Forms with many fields

- Split the form into sections with clear headings.
- Use progressive disclosure for advanced or rarely edited fields.
- Keep sensible defaults and prefill derived values when possible.
- Prefer inline validation and field-specific error messages.
- Use compact helper text for constraints, formats, and side effects.
- Support key-value editors, option lists, booleans, and select inputs with the same conventions as the existing admin.
- Add a read-only summary or preview before submit when the form is large or risky.
- Keep destructive actions behind explicit confirmation.

## Dense data views

- Show a summary first, then filters/search, then the detailed record.
- Prefer compact tables, badges, chips, and grouped metadata for list views.
- Use dialogs or drawers for detail editing when the main page already contains many controls.
- Make loading, empty, and error states explicit.
- Keep visible status labels short and consistent.

## Implementation rules

- Reuse the project UI components before introducing new primitives.
- Keep layout, spacing, and dark admin styling consistent with the existing panel.
- Avoid unnecessary rerenders and only add memoization when the data flow actually needs it.
- Isolate heavy admin features behind dynamic imports if they increase the shell cost.
- Preserve keyboard navigation, focus states, and accessible labels.

## Do not

- Build one huge form when the data can be grouped.
- Duplicate backend shapes by hand when the resource config already defines them.
- Introduce a new visual language for admin screens without a clear reason.
- Hide validation failures or submission side effects.

