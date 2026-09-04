# PMO Hub architecture

## ER model

```mermaid
erDiagram
  INITIATIVE ||--o{ INITIATIVE_YEAR : owns
  INITIATIVE_YEAR ||--|| PREPARATION_STAGE : defaults
  INITIATIVE_YEAR ||--o{ QUARTER_CARD : schedules
  PREPARATION_STAGE ||--o{ PREPARATION_STAGE_DEPARTMENT : involves
  QUARTER_CARD ||--o{ QUARTER_CARD_DEPARTMENT : pools
  QUARTER_CARD ||--o{ SCOPE_ITEM : contains
  SCOPE_ITEM ||--o{ SCOPE_ITEM_EXECUTOR : executes
  QUARTER_CARD ||--o{ QUARTER_CARD_CUSTOM_FIELD_VALUE : extends
  CUSTOM_FIELD_DEFINITION ||--o{ QUARTER_CARD_CUSTOM_FIELD_VALUE : defines

  INITIATIVE {
    uuid id PK
    string kind
    string name
    int revision
  }
  INITIATIVE_YEAR {
    uuid id PK
    uuid initiative_id FK
    int year
    string strategic_goal
    int revision
  }
  PREPARATION_STAGE {
    uuid initiative_year_id PK_FK
    uuid manager_id FK
    uuid priority_id FK
    int revision
  }
  QUARTER_CARD {
    uuid id PK
    uuid initiative_year_id FK
    int quarter
    uuid status_id FK
    decimal total_weight
    string size_snapshot_name
    int revision
  }
  SCOPE_ITEM {
    uuid id PK
    uuid quarter_card_id FK
    uuid lineage_id
    uuid copied_from_item_id
    string status_code
    decimal weight_snapshot_value
    int revision
  }
```

`InitiativeYear(initiative_id, year)`, `QuarterCard(initiative_year_id, quarter)`, and `ScopeItem(quarter_card_id, lineage_id)` are unique. Aggregate children cascade; dictionary references use `NO ACTION`. Historical weights and sizes are snapshots and never depend on later dictionary edits.

## Command rules

- Create backlog: atomically creates Initiative, InitiativeYear and PreparationStage.
- Create card: backend copies manager, priority and effective involved departments from the nearest earlier card in the same year; PreparationStage is the fallback. Status is DEFAULT; notes, scope and custom fields start empty.
- Extend year: strategic goal is empty. Preparation defaults come from the latest source card, otherwise from the source PreparationStage.
- Continue card: creates a new DEFAULT card with source metadata, notes and custom values, but no scope.
- Move card: preserves the card ID and content, changes its year/quarter, and resets card status to DEFAULT. Occupied targets are rejected.
- Move scope: non-GREEN item preserves ID, lineage, status, weight snapshot and executors. Both cards are recalculated.
- Copy scope: non-GREEN item receives a new ID but preserves lineage, text and executors; target status and weight reset to the system DEFAULT values. Duplicate lineage is rejected.

Every write executes in a serializable transaction where needed. Revisions are checked with conditional `updateMany`; stale aggregates return HTTP 409 `REVISION_CONFLICT`. Archived source periods cannot be mutated, while copying from an archived card into an open target remains allowed.

## Frontend data flow

Wire data is `snake_case`. Query keys are separated into session/bootstrap, initiative years, portfolio cards, canonical year/card detail, audit and reference data. Writes are server-first:

```text
mutation -> commit -> canonical GET/refetch -> cache update -> close form
```

There are no optimistic server-state updates. A failed commit keeps the form and cache unchanged. Abort signals are forwarded to GET requests, access-token refresh is single-flight, and a failed refresh clears authentication plus the full query cache.

Dashboard data is not sourced from the portfolio collections. Quarterly and annual analytics are split into the `overview`, `workload`, `trends`, and `planning-health` resources. Every resource applies `kind`, `year`, `quarter`, `department_id`, and `manager_id` on the server and returns only the fields required by its widget group. Aggregates never include card-ID collections. Paginated records are loaded separately from `GET /analytics/drilldown`, using server-side dimensions such as `status_id`, `size_name`, `priority_key`, `manager_id`, or `risk`.

## Export flow

- `GET /exports/availability` and `POST /exports/preview` return lightweight metadata and counts only.
- `POST /exports/excel` builds filtered initiative sheets on the backend; the browser only downloads the resulting Blob.
- `POST /exports/json/ai` never includes scope-item text and includes custom fields only by explicitly selected definition IDs.
- `POST /exports/json/full` is SUPER_ADMIN-only and returns all table rows except refresh sessions, with user password hashes redacted.
- Export attempts are audited. Excel and AI exports require `canAccessAdmin`; exports never mutate portfolio data.

## Analytics aggregation rules

- Quarterly mode includes only the selected quarter. Every widget uses the same type, year, quarter, department and manager filters.
- Annual card count and total workload include every QuarterCard in the selected year.
- Annual initiative count is the number of unique `(kind, initiative_id)` values.
- Annual status, size, weight and progress aggregate every QuarterCard in the selected year. Progress uses `GREEN = 100%`, `YELLOW = 50%`, other scope statuses = `0%`.
- Annual duration is the average number of existing quarterly cards per unique initiative.
- Annual department workload is the sum of its four quarterly loads; annual capacity is four times the quarterly department limit.
- Executor load is task snapshot weight divided equally among its executors.
- Effective involved load is `(card total snapshot weight / scope item count) / effective involved department count`.
- Type, department and manager filters are combined with AND. Department-filtered capacity contains only the selected department.
- Drill-down IDs are produced from the same filtered card set as the aggregate.
- Annual “current risks” use only the latest quarterly card of each initiative; all other annual widgets aggregate every quarterly card.
- Analytics pages independently cache `/analytics/{quarterly|annual}/{overview|workload|trends|planning-health}`. Full card records are fetched only from paginated `/analytics/drilldown` after a user action.
- Portfolio collections return summary records without scope/custom-field payloads. Canonical card detail and audit history are loaded when the modal/history tab opens.
- Backlog loads full summaries only for its active project/task tab; the inactive tab uses the lightweight `/initiative-years/counts` endpoint.

Archived quarters

- A quarter becomes archived at 00:00 on day 15 of the next quarter in `Europe/Kyiv`.
- With `canEditArchive`, only card notes, card status and scope-item statuses remain editable. Scope structure, weights, departments, manager, priority, move and delete stay blocked.
- Card status analytics use the immutable semantic category `DEFAULT | ON_TRACK | AT_RISK | BLOCKED | COMPLETED`; display name and color remain configurable.

## Security and operations

`isReadOnly` overrides mutation permissions in guards and services. Card and scope archive rules are enforced by backend policy. Audit aggregate IDs are strings rather than UUID-only columns, so dictionary and route identifiers cannot break a completed business mutation.

Production requires an explicit non-local `VITE_API_URL`. Cookie security and origin allowlists are configured through backend environment variables.

Used custom-field options keep stable IDs and historical values. Removing an option already present in a card deactivates it instead of deleting it; inactive options are not offered for new values.
