# Backlog visual design QA

## Evidence

- Source visual truth (standard state): `C:\Users\krave\AppData\Local\Temp\codex-clipboard-381818b9-f5a8-4811-b717-7ae88a5cdb30.png`
- Source visual truth (selection state): `C:\Users\krave\AppData\Local\Temp\codex-clipboard-38a11606-af9a-43cc-9ba3-9c70b1de8000.png`
- Browser-rendered implementation: `D:\dev\pmohub\frontend\backlog-implementation-final.png`
- Browser-rendered selection state: `D:\dev\pmohub\frontend\backlog-selection-final.png`
- Full comparison: `D:\dev\pmohub\frontend\backlog-design-comparison-final.png`
- Focused selection comparison: `D:\dev\pmohub\frontend\backlog-selection-comparison-final.png`
- Verification URL: `http://localhost:3001/`
- Browser: Codex in-app Browser.

## Capture normalization

- Standard source: 1705 × 411 px.
- Standard implementation comparison: 1705 × 411 px.
- Selection source and implementation comparison: 526 × 130 px each.
- Design viewport: desktop content width approximately 1707 CSS px.
- Browser verification viewport: 2011 × 900 CSS px, which includes the 280 px application sidebar and page padding.
- The in-app capture surface applies a 1.5 desktop render scale. An expanded 3000 × 900 capture was cropped to the Backlog content region and downsampled with Lanczos filtering to the exact source dimensions. Comparisons therefore use equal pixel sizes rather than comparing different display densities.
- Compared state: Super Admin, Backlog, 2026, Projects tab, “Всі квартали”, default filters. The focused comparison uses one selected initiative in bulk-extension mode.

## Final comparison

### Full view

- Header begins at 34 px, measures approximately 131 px high, and keeps the same white elevated surface, 24 px radius, indigo actions, dark heading, year control and quarter segmented control as the reference.
- Project/task tabs align at approximately 201 px and retain the indigo selected underline and pale selected surface.
- The filter row begins at approximately 327 px, matching the reference vertical rhythm and input sizing.
- Dataset counts differ from the visual reference because the running PMO Hub demo contains 2 projects and 1 task; this is expected dynamic content, not design drift.

### Focused selection state

- The selection panel matches the reference hierarchy: pale indigo container, selected count, primary confirmation and secondary cancel action.
- Buttons use the same wording and no additional icon decoration.
- The panel remains inside the header at the desktop target width and wraps safely at narrower widths.

## Required fidelity surfaces

- Fonts and typography: the existing application sans-serif stack is retained; weights, scale and hierarchy were adjusted to match the reference. No actionable wrapping or truncation mismatch remains.
- Spacing and layout rhythm: header, tabs and filters now match the source section positions and control heights. Desktop, 1280 px and 390 px layouts were checked.
- Colors and visual tokens: slate text/surfaces, indigo primary actions, pale indigo selection surfaces and subtle borders/shadows match the reference intent with accessible contrast.
- Image quality and assets: the reference contains no raster product imagery. UI icons use the installed Lucide icon family; no emoji, CSS drawings, inline SVG artwork or generated placeholders were introduced.
- Copy and content: CTA, tab, filter and selection wording matches the requested Ukrainian interface. “Стратегічна ціль” intentionally follows the current domain terminology.
- Accessibility: semantic buttons, labelled filters, labelled checkboxes, disabled confirmation state, focus rings and minimum practical control heights are present.

## Interaction verification

- Enter bulk-extension mode: passed.
- Select an eligible initiative and update “Вибрано”: passed.
- Cancel without data mutation: passed.
- Confirm and create the 2027 snapshot: passed.
- Re-enter selection mode after confirmation: the extended row shows “Продовжено” and exposes no checkbox.
- Quarter segmented filter: passed.
- Name filter: passed.
- Browser console errors: none.

## Comparison history

1. Initial pass — P1: desktop controls were pushed too far right and the selection state risked clipping. Fixed by aligning controls immediately after the title and assigning reference-based desktop widths.
2. Second pass — P2: the implementation was vertically denser than the source. Fixed by matching the 34 px top offset, approximately 128 px header, 36 px section spacing and larger reference typography/control heights.
3. Third pass — P2: Q4 exceeded the header boundary at a 390 px viewport. Fixed with mobile-specific segmented-control type and padding while preserving desktop measurements.
4. Final pass — no actionable P0, P1 or P2 findings. Any remaining sub-pixel differences are attributable to font rasterization and dynamic demo content.

## Annotation update — priority, goal preview and period availability

- Source visual truth: the three Backlog annotations supplied in the current task.
- Browser-rendered verification: `D:\dev\pmohub\frontend\backlog-annotations-final.png`.
- Verification URL: `http://localhost:3001/`.
- Focused regions: priority badges, strategic-goal preview and Q1–Q4 card controls.

### Resolved annotations

1. **Priority badge:** all labels now use the same 112 px width. Critical is rose, High is orange, Medium is amber and Low is emerald; unknown values remain neutral slate.
2. **Strategic goal:** the list preview clamps to three rendered lines and preserves manual line breaks. The native hover tooltip contains the complete, untruncated value.
3. **Past quarters:** Backlog creation controls are disabled and muted for every quarter before the current calendar quarter. The Q1 and Q2 buttons are disabled in the 2026 verification state; Q4 remains enabled. The click handler independently rejects a past-period action as a defensive guard.

### Verification

- Browser DOM check: priority width is 112 px; critical badge has rose styling; strategic-goal preview has `line-clamp-3`; Q1 is disabled and Q4 enabled.
- Browser console errors: none.
- `npm run test`: 7 files, 23 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed. Vite reports the existing large-chunk warning only; it does not fail the build.

## Scope-status annotation update

### Comparison target and evidence

- Source visual truth: browser annotation #1 in the current task, targeting `tr:nth-of-type(2) > td.bg-slate-50.px-6 > div.flex.flex-wrap > span.rounded-xl.border` on `http://localhost:3001/`.
- Source capture: current-task browser annotation image, 1807 × 1123 px, desktop Backlog / expanded initiative state.
- Implementation capture: `D:\dev\pmohub\frontend\backlog-scope-status-final.png`, 1807 × 1123 px.
- CSS viewport and density: 1807 × 1123 CSS px, in-app Browser capture at 1:1; no density normalization required.
- State: Super Admin, Backlog, 2026, Projects, “Нова клієнтська платформа” expanded.

The annotation specifies information to add rather than an exact new visual composition. The focused comparison therefore verifies the annotated region in the same expanded table state, while preserving the existing Backlog tokens and layout.

### Focused comparison

- The former single text chip is now a compact quarter summary card, preserving its location beneath the initiative row.
- It shows a readable quarter/year title, a semantic colour badge for the initiative health, the total scope-item count, completed/total count, percentage, and a matching progress bar.
- The Q3 2026 demo card renders “В процесі”, “3 завдань у scope”, and “1/3 · 33%”. Its amber progress bar is intentionally proportional to the number of completed checklist items.

### Required fidelity surfaces

- Fonts and typography: follows the established Backlog hierarchy—14 px/extra-bold period label, 11–12 px semantic label and metadata, without truncating the key numbers.
- Spacing and layout rhythm: 272 px minimum-width summary cards wrap without overlapping table columns; the compact 16 px radius, 16 px internal padding, and 8 px progress track are consistent with the existing interface.
- Colors and visual tokens: green, amber, rose, slate and neutral statuses use the same semantic Tailwind palette as existing health controls. Progress colour follows the current health status.
- Image quality and asset fidelity: this surface has no raster imagery. Existing Lucide assets and the application’s native UI components are retained.
- Copy and content: Ukrainian status text, scope count, completed count and percentage are explicit and derived from the card’s actual checklist.

### Verification

- Browser DOM: Q3 2026 status uses amber styling, scope count is present and its progress bar exposes `aria-valuenow="33"`.
- Browser console errors: none.
- Interaction: expanding and collapsing an initiative continues to work; other rows remain unaffected.
- `npm run test`: 7 files, 24 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed. Vite reports the existing large-chunk warning only; it does not fail the build.

## Status and control annotation update

### Comparison target and evidence

- Source visual truth: browser annotations #1–#3 in the current task on `http://localhost:3001/`.
- Source captures: current-task browser annotation images, 1807 × 1123 px, desktop Backlog state.
- Implementation capture: `D:\dev\pmohub\frontend\backlog-status-controls-final.png`, 1807 × 1123 px.
- CSS viewport and density: 1807 × 1123 CSS px at 1:1; no density normalization required.
- State: Super Admin, Backlog, 2026, Projects, “Нова клієнтська платформа” expanded.

### Resolved annotations

1. **Shared status language:** `src/domain/health.ts` is the single presentation source for card and Backlog status labels and semantic colours. Gray/default is “Без статусу”, green is “Виконано”, yellow is “В процесі”, and red is “На паузі / блоковано”.
2. **Header adaptability:** the title and controls use an adaptive grid; at the 1807 px target viewport all primary controls share one row. The segment title “Всі квартали” is non-wrapping.
3. **Select affordance:** a global 48 px right inset applies to native selects, moving their arrows safely away from the right border throughout the application.

### Required fidelity surfaces

- Fonts and typography: control text remains on a single line at the verification width; status terms are short, consistent and readable at the existing badge size.
- Spacing and layout rhythm: the header grid allocates available space among year, quarter, extension and add controls without creating a second control row.
- Colors and visual tokens: each health label and the matching card progress bar are sourced from one semantic colour definition.
- Image quality and asset fidelity: no imagery changes were needed; existing Lucide iconography is retained.
- Copy and content: the exact Ukrainian labels requested in the annotations are used in Backlog and card status pickers.

### Verification

- Browser DOM: header controls occupy a single horizontal row; “Всі квартали” is non-wrapping; filter selects use 48 px of right padding; the expanded Q3 card displays “В процесі” with amber styling.
- Browser console errors: none.
- `npm run test`: 8 files, 29 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed. Vite reports the existing large-chunk warning only; it does not fail the build.

## Adaptive controls and Backlog departments update

### Comparison target and evidence

- Source visual truth: browser annotations #1–#3 in the current task, plus the Backlog-modal behaviour specified in the user request.
- Source captures: current-task browser annotation images, 1807 × 1123 px.
- Implementation capture: `D:\dev\pmohub\frontend\backlog-adaptive-modal-final.png`, 1807 × 1123 px.
- CSS viewport and density: 1807 × 1123 CSS px, in-app Browser capture at 1:1; no density normalization required.
- State: Super Admin, Backlog, 2026, Projects; the modal was also opened and inspected.

### Resolved annotations and behaviour

1. **Compact header controls:** the year field is 160 px and the add button is 174 px wide; both are reduced from the prior state while retaining their full text. The controls have 52 px height and remain in one desktop row.
2. **Adaptive header:** the parent uses a bounded grid, with a smaller two-column fallback rather than overflow or broken controls when space is reduced.
3. **Backlog departments:** editable executor selection is removed from `BacklogModal`. Only involved departments can be chosen in the annual passport. Executor departments previously synchronized from a quarter card are preserved and displayed in a non-editable “Виконавці квартальних карток (синхронізовано)” section.

### Required fidelity surfaces

- Fonts and typography: action and year-control copy fits on one line without clipping; the compact 14–16 px scale remains consistent with the dense table toolbar.
- Spacing and layout rhythm: controls use 52 px height, 12 px gaps and a compact header padding while preserving the application’s 16–24 px radii.
- Colors and visual tokens: the indigo primary button, white secondary action and neutral select treatment remain unchanged.
- Image quality and asset fidelity: no raster assets changed; the installed Lucide plus icon remains the action icon.
- Copy and content: the modal distinguishes editable involved departments from read-only synchronized executors, matching the requested business rule.

### Verification

- Browser DOM: add button width 174 px and year field width 160 px; neither has horizontal text overflow. The year label renders “2026 рік”.
- Browser modal: no editable “Виконавці” section; synchronized quarter executors are visible; involved departments remain selectable.
- Browser console errors: none.
- `npm run test`: 9 files, 30 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed. Vite reports the existing large-chunk warning only; it does not fail the build.

## Backlog table structure and priority consistency update

### Comparison target and evidence

- Source visual truth: browser annotations #1–#2 and the additional Backlog requirements in the current task.
- Source captures: current-task browser annotation images, 1355 × 842 px.
- Implementation capture: `D:\dev\pmohub\frontend\backlog-columns-selection-final.png`, 1355 × 842 px.
- CSS viewport and density: 1355 × 842 CSS px, in-app Browser capture at 1:1; no density normalization required.
- State: Super Admin, Backlog, 2026, Projects, first initiative expanded; Projects portfolio was also opened to verify priority colour.

### Resolved annotations and behaviour

1. **Scope wording:** the quarter summary now shows Ukrainian task-count copy only, e.g. “3 завдання”; the English term `scope` is absent from the visible label.
2. **Table information architecture:** manager is the first data column; the title changes with the active tab—“Назва проєкту” or “Назва задачі”. Backlog entry type is increased to 17 px and supporting text to 12–15 px.
3. **Bulk selection:** the extension table header exposes “Вибрати всі”, which selects and clears all currently visible, eligible backlog rows without selecting initiatives already extended.
4. **Priority palette:** a shared priority-presentation function now drives Backlog, ProjectCard and TaskCard. Critical is consistently rose/red, High orange, Medium amber and Low green.

### Required fidelity surfaces

- Fonts and typography: scope metadata uses a compact readable 12 px treatment; entry names and manager values received a measured size increase without crowding the dense table.
- Spacing and layout rhythm: column order puts the frequent scanning attribute (manager) first and keeps quarter controls aligned after priority.
- Colors and visual tokens: priority badges use one semantic palette across portfolio cards and Backlog; the critical card badge verified as rose.
- Image quality and asset fidelity: no imagery changes; all existing icons and assets are retained.
- Copy and content: “scope” is removed from the user-facing summary; project/task headers and bulk-selection copy are Ukrainian and context-specific.

### Verification

- Browser DOM: table headers order is Manager → Name → Strategic goal → Priority; expanded Q3 card shows “3 завдання”.
- Interaction: “Вибрати всі” selects eligible rows; switching to Operational Tasks changes the header to “Назва задачі”.
- Portfolio check: the Critical priority badge uses `bg-rose-100`, matching Backlog.
- Browser console errors: none.
- `npm run test`: 10 files, 35 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed. Vite reports the existing large-chunk warning only; it does not fail the build.

## Bulk-extension control polish update

### Comparison target and evidence

- Source visual truth: browser annotations #1–#2 in the current task, 1694 × 1052 px.
- Implementation capture: `D:\dev\pmohub\frontend\backlog-extension-controls-final.png`, 1694 × 1052 px.
- CSS viewport and density: 1694 × 1052 CSS px, in-app Browser capture at 1:1; no density normalization required.
- State: Super Admin, Backlog, 2026, Projects, bulk-extension mode with no rows selected.

### Resolved annotations

1. **Select-all control:** the table header now contains only a 20 × 20 px checkbox, centred in the same 64 px column and styled like the row checkboxes. The accessible name and tooltip remain “Вибрати всі”.
2. **Confirmation layout:** in extension mode the Add button is intentionally hidden. The selection panel receives the released width, uses a 52 px single-row layout, 13–14 px button labels and 40 px actions, preventing the former overlap.

### Required fidelity surfaces

- Fonts and typography: confirmation labels are reduced slightly to preserve a single horizontal line while remaining bold and legible.
- Spacing and layout rhythm: the checkbox aligns with row controls; the confirmation controls have consistent 8 px internal gaps and a compact 16 px radius.
- Colors and visual tokens: the existing pale-indigo panel, indigo primary action and neutral cancel action remain unchanged.
- Image quality and asset fidelity: no imagery or icon assets are added or changed.
- Copy and content: visible select-all text is removed as requested; its accessible label is retained for keyboard and screen-reader use.

### Verification

- Browser DOM: header checkbox is 20 × 20 px; there is no visible “Вибрати всі” text; confirmation panel is 577 × 52 px; Add button is hidden only during bulk extension.
- Interaction: the checkbox still selects all eligible rows; Cancel restores the normal header controls.
- Browser console errors: none.
- `npm run test`: 10 files, 35 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed. Vite reports the existing large-chunk warning only; it does not fail the build.

## Shared status vocabulary and manager-order update

### Comparison target and evidence

- Source visual truth: the current browser annotation for the expanded Backlog quarter card (“В процесі”), plus the preceding Backlog table annotations.
- Source capture: current-task browser image, 1694 × 1052 px.
- Implementation capture: `D:\dev\pmohub\frontend\backlog-status-and-column-order-final.png`, 1694 × 1052 px.
- CSS viewport and density: 1694 × 1052 CSS px, in-app Browser capture at 1:1; no density normalization required.
- State: Admin user, Backlog, 2026, Projects. The first Backlog item was expanded and the Projects portfolio table was opened as focused comparison states.

### Comparison history

- [P1] **Conflicting health labels:** the portfolio table rendered the red state as “Блокер/На паузі” while the Backlog quarter summary used the new vocabulary. Fixed by making Project and Operational Task tables consume the same `healthStatusPresentation` as initiative cards and Backlog.
- [P2] **Backlog scanning order:** Manager appeared before the project/task and strategic-goal columns. Fixed by reordering the Backlog headers and cells to Name → Strategic goal → Manager → Priority.
- Post-fix browser evidence: the expanded Backlog card displays “В процесі”; the Project portfolio table displays “В процесі” and “На паузі / блоковано”; the Backlog header follows the requested new sequence.

### Required fidelity surfaces

- Fonts and typography: the existing 11 px uppercase header and 15–17 px content hierarchy are retained; the reordered columns do not introduce wrapping or clipping in the 1694 px viewport.
- Spacing and layout rhythm: the Name → Goal → Manager sequence preserves the established 16 px table rhythm and leaves quarter action columns aligned.
- Colors and visual tokens: the shared presentation maps gray/default to “Без статусу”, green to “Виконано”, yellow to “В процесі”, and red to “На паузі / блоковано” with the same semantic badges across Backlog, cards and tables.
- Image quality and asset fidelity: no imagery, logos or icons changed; the existing application assets remain intact.
- Copy and content: all visible health labels now use one Ukrainian vocabulary; no old “Блокер/На паузі” label remains in active portfolio tables.

### Verification

- Browser DOM: Backlog headers order is “Назва проєкту” → “Стратегічна ціль” → “Менеджер” → “Пріоритет”.
- Browser DOM: expanded Backlog Q3 card shows “В процесі”; Projects table shows “В процесі” and “На паузі / блоковано”.
- Browser console errors: none.
- `npm run test`: 10 files, 35 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed. Vite reports the pre-existing large-chunk warning only; it does not fail the build.

## Portfolio status-control, priority-badge and copy update

### Comparison target and evidence

- Source visual truth: the three current browser annotations for the Projects portfolio table, 1694 × 1052 px.
- Implementation capture: `D:\dev\pmohub\frontend\portfolio-status-priority-final.png`, 1694 × 1052 px.
- CSS viewport and density: 1694 × 1052 CSS px, in-app Browser capture at 1:1; no density normalization required.
- State: Admin user, Projects portfolio, 2026 Q3, Table view. The Operational Tasks table was opened as the corresponding content-state check.

### Comparison history

- [P2] **Inline status controls:** status chips and their four colour controls occupied one horizontal row. Fixed by stacking the control group directly below the readable status chip.
- [P2] **Plain English priority:** table cells showed raw values such as “Critical” and “High”. Fixed by resolving the same priority name and shared coloured badge treatment used by initiative cards and Backlog.
- [P2] **Generic period copy:** portfolio subtitles used generic or incomplete wording. Fixed to “Всі проєкти обраного періоду.” and “Всі задачі обраного періоду.”
- Post-fix browser evidence: the Project table shows a status badge followed by a second-row picker, rose “Критичний” and orange “Високий” pills; the Tasks table has the same status-picker structure, coloured priority and task-specific subtitle.

### Required fidelity surfaces

- Fonts and typography: the status label remains the primary readable element; the compact controls now sit on a separate line without compressing its all-caps 11 px label. Portfolio subtitles retain their original 14 px hierarchy.
- Spacing and layout rhythm: a 8 px vertical gap separates status from the four controls, keeping the action target immediately associated with the value while improving dense-table scanning.
- Colors and visual tokens: priority presentation reuses the shared semantic palette—rose for Critical, orange for High, amber for Medium and emerald for Low—matching cards and Backlog.
- Image quality and asset fidelity: no imagery or icon assets changed; existing Lucide controls and product assets are retained.
- Copy and content: raw English priority IDs are replaced with Ukrainian catalogue names; the project/task period copy is specific to the active portfolio.

### Verification

- Browser DOM: Project subtitle is “Всі проєкти обраного періоду.”; Task subtitle is “Всі задачі обраного періоду.”
- Browser DOM: status cells contain a readable label followed by the grouped “Обрати статус ініціативи” controls; Project and Task tables both expose this structure.
- Browser DOM: priority labels resolve to “Критичний” and “Високий”, matching card and Backlog vocabulary.
- Browser console errors: none.
- `npm run test`: 10 files, 35 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed. Vite reports the existing large-chunk warning only; it does not fail the build.

## Backlog archive-banner update

### Comparison target and evidence

- Source visual truth: [codex-clipboard-69c297f8-537e-4ada-b567-ce8e13356a4f.png](C:\Users\krave\AppData\Local\Temp\codex-clipboard-69c297f8-537e-4ada-b567-ce8e13356a4f.png), 1349 × 119 px.
- Implementation capture: `D:\dev\pmohub\frontend\backlog-archive-banner-final.png`, 1694 × 1052 px; the focused archive-banner region was compared with the supplied source reference.
- CSS viewport and density: implementation at 1694 × 1052 CSS px in the in-app Browser at 1:1; the source is a cropped banner, so comparison is normalized to the banner content rather than browser chrome or page width.
- State: Admin user, Backlog, Projects tab, 2025 archive year.

### Comparison history

- [P2] **Backlog-specific archive treatment:** Backlog showed a single compact “snapshot” notice unlike the portfolio archive banner. Fixed with the requested two-column archive banner: yellow folder icon and two-line copy on the left, outlined current-year return action on the right.
- Post-fix browser evidence: the Backlog page shows “Архівний період (2025)”, “Тільки для перегляду”, and “Повернутись на поточний рік”; all archive quarter-create actions remain disabled.

### Required fidelity surfaces

- Fonts and typography: title is an emphatic 22 px weight, supporting copy is 18 px, and the 18 px action label remains on one line—matching the source hierarchy.
- Spacing and layout rhythm: 20–32 px horizontal padding, 16 px icon/text spacing and a separated right-side action preserve the compact single-row desktop layout; the banner stacks safely on small screens.
- Colors and visual tokens: soft amber background, amber border, yellow folder treatment and white outlined amber action reproduce the source semantic archive state.
- Image quality and asset fidelity: no raster imagery is required; the existing Lucide folder icon system is retained for consistent product UI.
- Copy and content: Backlog now uses the source wording and no longer exposes the internal “snapshot” term in the banner.

### Verification

- Browser DOM: archive region exposes the title, read-only subtitle and return action; the selected year is 2025.
- Interaction: “Повернутись на поточний рік” resets the Backlog year to 2026.
- Browser console errors: none.
- `npm run test`: 10 files, 36 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed. Vite reports the existing large-chunk warning only; it does not fail the build.

## Initiative-card modal redesign

### Comparison target and evidence

- Source visual truth: the five supplied modal references: [creation state](C:\Users\krave\AppData\Local\Temp\codex-clipboard-e60c5951-728f-4b81-b7e3-fcbe413579a4.png), [populated creation](C:\Users\krave\AppData\Local\Temp\codex-clipboard-e229365d-7360-4f36-b198-4b27db5ec361.png), [edit state](C:\Users\krave\AppData\Local\Temp\codex-clipboard-5283cad6-deb2-4e87-a81e-50587cf0b50d.png), [scope move](C:\Users\krave\AppData\Local\Temp\codex-clipboard-fd613384-8181-47eb-8a27-a6e063480610.png), and [card move](C:\Users\krave\AppData\Local\Temp\codex-clipboard-5a9fe7b8-d742-4953-b2d5-4221d0c48976.png).
- Implementation captures: `D:\dev\pmohub\frontend\initiative-modal-final.png` and `D:\dev\pmohub\frontend\initiative-move-forms-final.png`, 1207 × 930 px browser capture.
- CSS viewport and density: in-app Browser at 1:1. The references are narrower modal crops, so the review normalizes to the modal content region rather than surrounding page chrome.
- States tested: editing a Q3 project card; adding/removing executor controls; card continuation panel; individual scope-item move panel. The same shared modal renders Operational Task cards.

### Comparison history

- [P1] **Separate modal implementations drifted:** Project and Task forms had duplicate, compressed layouts and different future behaviour risk. Fixed with a common `InitiativeCardModal` component.
- [P1] **Department state was ambiguous:** all departments were selectable as executors directly from scope. Fixed with a three-state presentation: white for available departments, amber for involved departments, and locked purple/blue “Виконавець” chips for departments currently used by scope tasks. Scope executor select options are constrained to involved/executor departments.
- [P2] **Modal hierarchy and move panels:** the old controls did not follow the supplied creation/edit/move compositions. Fixed with a bordered header, explicit top edit actions, two-column metadata fields, resizable strategic-task textarea, scoped card treatment and indigo move panels.
- Post-fix evidence: the opened Project modal renders blue executor chips for IT & Development and Marketing & PR, amber Customer Support, a multiline strategic-task field, stackable scope cards, no red bottom delete action, and both requested move-panel variants.

### Required fidelity surfaces

- Fonts and typography: modal headings use a 20 px heavyweight, labels use 14 px weight, dense scope controls use 12–14 px text, and action labels remain readable without clipping.
- Spacing and layout rhythm: 24 px modal padding, 16–20 px section separation, 12 px form radii and compact 32 px scope controls follow the reference’s dense professional rhythm; the viewport scrolls only inside modal content.
- Colors and visual tokens: indigo controls drive save/move actions, amber means involved department, purple/blue means immutable executor, and neutral white identifies available departments.
- Image quality and asset fidelity: no raster assets are involved; the established Lucide icon system provides close, consistent action icons.
- Copy and content: headings, field labels, scope and move copy are Ukrainian; the strategic field is named “Стратегічна задача” and no redundant bottom “Видалити” action remains.

### Verification

- Browser DOM: modal exposes creation/edit actions, involved/executor chip states, scope executor controls, status selectors, scope move panel and card continuation panel.
- Interaction: select options for each scope item are limited to participating departments; executor chips are disabled in the involved-department strip until no scope item uses them.
- Behaviour: “Видалити з кварталу” calls the existing card deletion flow, so the corresponding active Backlog quarter check disappears with the card; domain delete guards remain in force.
- Browser console: two historical Vite HMR reload warnings were retained while the old modal files were replaced; the final rendered modal had no runtime rendering error. `typecheck` and production build pass.
- `npm run test`: 10 files, 36 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed. Vite reports the existing large-chunk warning only; it does not fail the build.

## Scope executor layout and rich-text editor

### Comparison target and evidence

- Source visual truth: the populated and editing modal references supplied for the initiative-card modal.
- Implementation capture: live in-app Browser review of the Q3 project edit modal after the layout update.
- States tested: a scope item with two executors, an item without executors, Notes editor, and standard custom fields.

### Comparison history

- [P1] **Selected executors displaced primary actions:** selected executor chips shared the same flex row as the weight, status, move and delete controls, causing those controls to wrap. Fixed by giving selected executors a dedicated second row in every scope item.
- [P1] **Notes were plain text:** the Notes field did not allow rich formatting. Fixed with a reusable rich-text editor offering bold, italic, underline, strike-through, text color, ordered and unordered lists, and clear formatting.
- [P1] **Formatted custom fields were not formatted:** `RICHTEXT` custom fields used a plain textarea. Fixed by routing them through the same reusable rich-text editor, while retaining normal inputs for the other field types.

### Required fidelity surfaces

- Fonts and spacing: first-row scope controls retain the compact reference scale; chips are grouped on a clearly separated 8 px second row.
- Colors and visual tokens: executor chips retain the existing purple/blue executor treatment; the editor uses the modal’s white surface, slate toolbar and indigo focus treatment.
- Interaction: status, move and delete controls remain in the primary scope-control row; choosing several executors only extends the chip row beneath it.

### Verification

- Browser DOM: each scope item exposes status buttons, move and delete actions before its executor chips; the Notes editor exposes all requested formatting actions.
- Visual check: an item with two executors renders both chips on the second row, while the weight selector, executor selector, status dots, move arrow and delete icon stay in the first row.
- `npm run typecheck`: passed.
- `npm run test -- --run`: 10 files, 36 tests passed.
- `npm run build`: passed. Vite reports the existing large-chunk warning only; it does not fail the build.

## Initiative scope status and rich-text preview

### Comparison target and evidence

- Source visual truth: the supplied initiative-card modal screenshots, including the selected-executor department chips.
- Implementation evidence: live in-app Browser review of the Q3 project modal after selecting “В процесі” for a scope item.

### Comparison history

- [P1] **Executor state label lacked contrast:** the `Виконавець` marker blended into the blue department chip. Fixed with a distinct translucent light label surface and improved executor-chip shadow.
- [P2] **Mixed-language modal copy:** header and helper copy used `scope`. Fixed to `Виконавці зі скоупу` and `у кожному завданні скоупу`.
- [P1] **Scope status lacked row-level feedback:** choosing a status only changed the dot. Fixed with status-specific task-row backgrounds and matching number badges: neutral, green, amber and red.
- [P2] **Task order was implicit:** scope tasks had no modal number. Fixed with automatic sequential numbering, including after a task is deleted.
- [P1] **Formatted notes were flattened in cards:** project and task cards stripped formatting. Fixed with a sanitised rich-text preview that preserves the supported formatting while retaining the compact three-line card layout.

### Verification

- Browser DOM: the department heading says `Виконавці зі скоупу (2)`; helper text contains no English `scope`; all scope tasks expose sequential `1.`, `2.`, `3.` labels.
- Visual check: selecting `В процесі` changes the task row and its number badge to amber; status, move and delete controls remain in the first control row.
- `npm run typecheck`: passed.
- `npm run test -- --run`: 10 files, 36 tests passed.
- `npm run build`: passed. Vite reports the existing large-chunk warning only; it does not fail the build.

## Strategic-goal card indicator and custom-field editing

### Comparison target and evidence

- Source visual truth: the supplied Portfolio Projects card screenshot.
- Implementation evidence: live in-app Browser review of the project-card grid and the Custom Fields editor dialog.

### Comparison history

- [P2] **Strategic-goal copy overcrowded cards:** the full multiline goal was visible on the compact card. Fixed: a populated goal now uses a green checkmark and an absent goal uses an em dash. Full text remains in the modal and table.
- [P2] **Table goal preview was too short:** changed the table preview from two to three lines while retaining the full text on hover.
- [P1] **Existing custom fields could not be edited:** added the edit action and a prefilled modal for field name, entity, type, Select values, required state, and table/card visibility.

### Verification

- Browser visual check: project cards render the strategic-goal checkmark instead of the goal text.
- Browser visual check: the `Бюджет ($)` custom field opens in the edit modal with all stored configuration values populated.
- `npm run typecheck`: passed.
- `npm run test -- --run`: 10 test files completed successfully; 36 tests pass.
- `npm run build`: passed. Vite reports the existing large-chunk warning only; it does not fail the build.

## Table alignment, size-reference layout and rich-text highlighting

### Comparison target and evidence

- Source visual truth: the supplied Administration screenshot for `Розмір (вага) ініціативи`.
- Implementation evidence: live in-app Browser review of the Administration dictionaries screen after the update.

### Comparison history

- [P2] **Initiative-size title sat inside the table panel:** removed the decorative icon and moved the heading into the same outside-of-table treatment used by neighbouring dictionary sections.
- [P1] **Table headings were inconsistent:** all table header cells now use a shared centered alignment rule.
- [P1] **Portfolio priority could overlap executors:** increased the dedicated priority column and badge width in Project and Operational Task portfolio tables.
- [P1] **Custom-field identity could be accidentally changed:** entity type and data type are now read-only in the edit modal; configurable metadata remains editable.
- [P2] **Rich text could not highlight text:** added a distinct text-background colour control beside the text-colour control.

### Verification

- Browser visual check: the initiative-size title is above the white table panel without an icon; its column headers are centered.
- `npm run typecheck`: passed.
- `npm run test -- --run`: 10 files, 36 tests passed.
- `npm run build`: passed. Vite reports the existing large-chunk warning only; it does not fail the build.

## Portfolio table header alignment and formatted-note previews

### Comparison target and evidence

- Source visual truth: the current Portfolio Projects table and card views in the in-app Browser.
- Implementation evidence: live Browser capture of the Q3 Project portfolio table after the alignment and width changes.

### Comparison history

- [P2] **Global centering overreached:** table headers are now left-aligned by default; only `Статус ініціативи` and `Пріоритет` in portfolio tables retain centered headers.
- [P1] **Formatted notes were flattened in portfolio tables:** Project and Operational Task table previews now use the rich-text renderer instead of plain-text stripping.
- [P1] **Text background highlight was dropped:** sanitisation now preserves safe foreground and background colour styles generated by the editor.
- [P2] **Long notes had an inconsistent preview limit:** formatted note previews in both cards and portfolio tables are limited to five lines and expand on hover without discarding formatting.

### Verification

- Browser visual check: Project portfolio headers are left-aligned except the centered status and priority columns; the expanded priority width does not collide with executors.
- `npm run typecheck`: passed.
- `npm run test -- --run`: 10 files, 36 tests passed.
- `npm run build`: passed. Vite reports the existing large-chunk warning only; it does not fail the build.

## Portfolio status-column terminology

### Verification

- Project portfolio table header: `Статус проєкту`.
- Operational Task portfolio table header: `Статус задачі`.
- `npm run typecheck`: passed.

## Plain-text note tooltips

### Verification

- Portfolio note previews remain formatted in the cell, while their hover tooltip is derived from sanitized plain text only.
- The preview remains capped at five lines; hover no longer expands formatted content inline.
- `npm run typecheck`: passed.

## White plain-text note tooltip

### Verification

- Rich-text previews no longer use the browser's native black tooltip. Hover now renders a product tooltip with a white background, slate border, shadow, and sanitized plain text.
- `npm run typecheck`: passed.

## Expanded portfolio note previews

### Verification

- Notes are capped at five lines in portfolio cards and tables, then expand in place to their complete formatted content on hover.
- The white plain-text cursor tooltip remains available while the rich preview expands.
- `npm run typecheck`: passed.

## Findings

No actionable P0, P1 or P2 findings remain for the annotated initiative-modal surfaces.

## Annual backlog records and preparation stage

### Behaviour verified

- A backlog entry is now one annual record with a stable `initiative_chain_id` shared across years.
- Creating an entry requires only its title and optional strategic goal. Its hidden preparation stage is shown in the expanded Backlog row only when the year has no quarter card.
- The preparation stage stores manager, priority and involved departments; executors remain exclusive to scope tasks in a quarterly card.
- Creating a first quarterly card copies the preparation-stage data. Continuing an initiative creates the target annual record and copies the latest source-quarter card, or preparation-stage data if no quarter card exists.
- Full-card moves are rejected when the target period already contains a linked card. Scope-item moves still offer the guarded merge preview and confirmation.

### Backlog card detail update

- The main Backlog table no longer exposes manager and priority columns.
- Expanded yearly entries present these attributes inside their preparation or quarterly cards, together with involved departments.
- A quarterly card remains visually compact but includes health status and real scope progress; selecting it opens the same initiative-edit modal used by portfolio cards.
- A quarterly card opened from Backlog starts in review mode. Its footer exposes `Редагувати`; only after that explicit action does the footer switch to `Зберегти`.
- Save menus and cross-card propagation controls are removed from Backlog and portfolio card modals. Saving affects only the currently open card.

### Automated verification

- `npm run typecheck`: passed.
- `npm run test -- --run`: 10 files, 36 tests passed.
- `npm run build`: passed. The existing large-chunk warning remains non-blocking.

final result: passed
