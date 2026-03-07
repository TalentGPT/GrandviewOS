# UX Audit — GrandviewOS

**Auditor:** Staff Product Designer + Principal Frontend Architect  
**Date:** 2026-03-07  
**Scale:** 1 (prototype) → 10 (Stripe/Linear quality)

---

## 1. Task Manager — Score: 6.5/10
- **Visual hierarchy:** Good stat cards + model fleet. Session cards well structured. ✓
- **Spacing:** mb-10 on stats, mb-4 elsewhere — inconsistent. Needs mb-12 sections.
- **Typography:** Uses text-h1, stat-value correctly. Session titles good.
- **Interaction:** Session hover works. Kill button clear. Tab bar is clean.
- **Density:** Slightly dense in session cards. Token/cost labels are good.
- **States:** Has loading skeleton, error banner. No empty state for zero sessions.
- **Issues:** PageHeader separator missing. Emoji still in mock session titles (agentEmoji). StatCard `icon` prop unused but passed. Content not centered (page-container is max-w-1200 but padding varies).

## 2. Org Chart — Score: 6/10
- **Visual hierarchy:** CEO/COO cards with glow are good. Department heads clear.
- **Spacing:** mb-8 between sections — needs more breathing room.
- **Typography:** Mixing text sizes well. Legend is clean.
- **Interaction:** Accordion expand works. Agent cards clickable.
- **Density:** Department accordions work well for information density.
- **States:** No loading state. No empty state.
- **Issues:** Uses emoji for agents (👤, 🐕). Connecting lines are basic divs. PageHeader not using shared component fully (no separator).

## 3. Standup — Score: 6/10
- **Visual hierarchy:** Meeting header clear. Conversation blocks with colored borders good.
- **Spacing:** Reasonable but inconsistent (mb-4 vs mb-6).
- **Typography:** Clean speaker labels. Action items readable.
- **Interaction:** Archive toggle, new standup button clear. Audio player functional.
- **Density:** Good balance in conversation view.
- **States:** Has triggering state, running state. Good.
- **Issues:** Not using PageHeader component (custom header). Audio player could be sleeker. Emoji in data source toggle (🔌, 📋). No two-column layout for conversation + actions.

## 4. Workspaces — Score: 5.5/10
- **Visual hierarchy:** Breadcrumb is clear. File tree readable.
- **Spacing:** Sidebar spacing is tight. Content area ok.
- **Typography:** Markdown rendering good. File names clear.
- **Interaction:** Agent selection, file selection clear. Edit mode works.
- **Density:** Left panel good. Content area spacious.
- **States:** Has empty state. Edit/save flow works.
- **Issues:** Uses emoji for agents and files (📄, 📁). Gold selection highlight instead of teal. No status dots for agents. -m-4/-m-6 negative margin hack. No teal left-border active state.

## 5. Docs — Score: 5.5/10
- **Visual hierarchy:** Sidebar nav clear. Content rendered well.
- **Spacing:** Sidebar items well-spaced. Content max-w-3xl good.
- **Typography:** Markdown styles solid. Nav items readable.
- **Interaction:** Regenerate docs button clear. Nav selection visible.
- **States:** Has loading state for regeneration. Generated docs indicator.
- **Issues:** No PageHeader. Active nav uses teal border but also background highlight. Sidebar feels basic. -m-4/-m-6 hack.

## 6. Settings — Score: 5/10
- **Visual hierarchy:** Two-column grid works. Section headers clear.
- **Spacing:** Consistent within cards. Gap between sections ok.
- **Typography:** Key-value pairs readable.
- **Interaction:** Mostly read-only. Status indicators clear.
- **States:** Has loading state, error state. Good.
- **Issues:** No PageHeader (custom). Uses emoji (📱, 💬, 🔗). Cards don't use shared card class. Feels like a settings dump, not designed.

## 7. Brain Module

### Memory Viewer — Score: 6/10
- Good file browser layout with agent picker + file list + content
- Search bar works. Timeline view toggle is nice.
- **Issues:** Uses emoji. Purple accent instead of consistent teal for active states. No PageHeader.

### Daily Briefs — Score: 5.5/10
- Date selector sidebar + detail view works
- Metric cards in detail are smaller than main stat cards (inconsistent)
- **Issues:** No PageHeader. Emoji in stat cards (📊, 🔤, 💰). Event list is basic.

### Automations — Score: 6/10
- Clean list with status badges. Timeline visualization is nice.
- Add form is functional. Toggle pause/delete works.
- **Issues:** No PageHeader. Emoji everywhere. Stat cards have icon prop with emoji.

### Project Tracking — Score: 6/10
- Kanban board layout works. Move buttons functional.
- Card design is clean. Column counts visible.
- **Issues:** No PageHeader. Move buttons on every card look cluttered. No drag indicators. Emoji in agent tags.

## 8. Lab Module

### Idea Gallery — Score: 6/10
- Grid cards with vote buttons work well. Tag filters functional.
- Expanded modal clean. Add form works.
- **Issues:** No PageHeader. Cards could be more polished. Emoji in agent attribution.

### Prototype Fleet — Score: 5.5/10
- List layout works. Status badges clear. Action buttons functional.
- Stats row with mono font is good.
- **Issues:** No PageHeader. Emoji in status labels (🧪, 🎓, 📦). Stat cards have emoji. Dense action buttons.

### Weekly Reviews — Score: 5.5/10
- Week selector + detail view works. Performance table clean.
- Highlights/lowlights cards good.
- **Issues:** No PageHeader. Emoji in stat cards and highlights. Table styling basic.

### Ideation Logs — Score: 6/10
- Timeline layout with expandable entries is nice. Filters work.
- Key ideas + outcomes sections clean.
- **Issues:** No PageHeader. Emoji in participant tags. Timeline dots basic.

---

## Cross-Cutting Issues

1. **PageHeader inconsistency:** Only TaskManager and OrgChart use the shared PageHeader. All other pages have custom headers.
2. **Emoji overuse:** Nearly every page uses emoji for icons. Should use colored dots and clean text.
3. **StatCard icon prop:** Defined but unused in the component. Pages pass emoji icons that do nothing.
4. **No separator line:** PageHeader lacks a border-bottom separator.
5. **Section spacing:** Varies from mb-4 to mb-10. Should standardize to mb-12 for major sections.
6. **Active state colors:** Some pages use gold, some purple, some teal. Should standardize to teal.
7. **Negative margins:** Workspaces and Docs use -m-4/-m-6 hacks for full-width layouts.
8. **Missing shared components:** No TabBar, SectionHeader, or SessionCard as reusable components.

## Priority Fixes

1. Update index.css design system (border colors, utility classes)
2. Create shared components: TabBar, SectionHeader, SessionCard
3. Update PageHeader with separator line
4. Apply PageHeader to ALL pages
5. Remove emoji from stat cards and status indicators
6. Standardize spacing rhythm (mb-12 sections)
7. Standardize active state color to teal
8. Fix Workspaces/Docs layout without negative margins
