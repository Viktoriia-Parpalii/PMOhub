# Design QA — auth password flow

- Source visual truth: `C:\Users\krave\AppData\Local\Temp\codex-clipboard-d450c47e-a215-476c-805d-ad840f2db519.png`
- Login implementation: `D:\dev\pmohub\artifacts\login-password-control.png`
- Required-password implementation: `D:\dev\pmohub\artifacts\forced-password-page.png`
- Focused comparison: `D:\dev\pmohub\artifacts\password-eye-comparison.png`
- Full-view comparison: `D:\dev\pmohub\artifacts\auth-design-comparison.png`
- Reference pixels: 763 × 694. The reference is consistent with an approximately 1.5× capture density: its 672 px panel corresponds to the existing 448 CSS px auth panel.
- Login capture: 763 × 694 pixels, CSS viewport 763 × 694, device pixel ratio 1.
- Required-password capture: 1280 × 720 pixels, CSS viewport 1280 × 720, device pixel ratio 1.
- States: unauthenticated login; authenticated user with `must_change_password=true`.

## Findings

- No actionable P0/P1/P2 differences remain in the requested password-visibility control. The focused comparison confirms that the native black browser reveal control is absent and exactly one application-owned gray eye remains.
- The new required-password page uses the same PMO Hub auth palette, typography, border, radius, input, button and elevation tokens. It is intentionally a dedicated page rather than an overlay over analytics.
- Fonts and typography: existing application font stack, weights and label hierarchy are preserved.
- Spacing and layout rhythm: centered auth card, existing 448–512 px content width, responsive padding and consistent vertical form rhythm.
- Colors and visual tokens: `#f8fafc` page, white surface, slate text/borders and indigo action color match the existing auth design.
- Image and icon fidelity: the existing PMO Hub brand mark is reused; the password and security actions use the application’s existing Lucide icon set.
- Copy and content: all auth text is Ukrainian and explains why the password change is mandatory and where the user goes afterward.

## Interaction and runtime verification

- Login exposes one visibility button; it changes the password input from `password` to `text` and back.
- Required-password page contains only `Новий пароль` and `Підтвердження пароля`; the already-used temporary password is not requested again.
- Required-password page exposes one custom visibility button for the new password.
- Component test confirms analytics is not mounted while `must_change_password=true`.
- Empty new/confirm password fields retain notification-based validation; ordinary profile password changes still validate the current password.
- No browser console errors were reported in either verified auth state.
- Final password submission was not executed during visual QA because it changes account credentials; the mutation path is covered by the existing application flow and component/type checks.

## Comparison history

1. Initial defect: source showed both a native black reveal icon and the application-owned gray icon.
2. Fix: native password reveal/credential controls were hidden globally while retaining the accessible application control.
3. Post-fix evidence: focused comparison and browser interaction show one gray icon and correct input type toggling.
4. First-login refinement: removed the redundant temporary-password field; the revised browser capture confirms exactly two password fields without changing the auth card’s visual rhythm.

Focused-region comparison was required because the reported defect is an input adornment; the full-page reference has a different capture density and is not used for false pixel-level sizing findings.

## Follow-up polish

- No remaining P3 item is required for this change.

final result: passed
