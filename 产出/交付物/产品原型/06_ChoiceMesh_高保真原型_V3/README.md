# ChoiceMesh high-fidelity prototype V3

| Field | Value |
| --- | --- |
| Status | Current interactive product prototype |
| Last revised | 2026-08-19 — design review fixes applied in place |
| Product definition | [ChoiceMesh V2 document index](../../../规划文档/Spec文档/00_ChoiceMesh_文档版本索引_V2.md) |
| Deployment target | GitHub Pages, static prototype only |

## What this prototype demonstrates

1. A member creates a room with one complete starting proposal — activity, date and time, place or area, estimated cost — and a participation rule.
2. Other members join by opening the invite link. No account and no code to type: whoever opens the link lands directly in the room.
3. In **My details**, each member can write or dictate what works for them. AI turns that message into a private draft they review before anything is recorded; it never confirms attendance for them.
4. Any member can propose a shared change. The change stays pending until another member supports it, and affected members then reconfirm their own details.
5. Any member who has confirmed their own details can open **Publish**. Publishing stays locked until the room rule, proposal completeness, confirmations, and an explicit publish acknowledgement are all satisfied.
6. A published result becomes a retained version. Later questions open a new coordination round rather than silently removing the earlier result.

## Privacy model shown in the prototype

- Private source text, reasons, routes, and individual budget limits remain private.
- Shared views use anonymous status and aggregate counts only — no names, no original wording, and no "who has not replied yet".
- A reminder does not change a member's status.
- A boundary risk is already verified and shown for awareness; it is not automatically a blocking task.

The prototype states this once in the sidebar and once on the card an invitee sees on entry, rather than repeating it under every control.

## 2026-08-19 revision

Fixes from an interaction-design review, applied as three override layers appended to the end of the file. No upstream rule or function body was edited — behavioural changes wrap the original through `window.<fn> = wrapper(original)`, visual changes are later CSS declarations. `scripts/build-demo.mjs` is unaffected: it still finds `function createPrivateDraft(`, its adapter is still appended last, and `const simulate = window.createPrivateDraft` still resolves to the prototype's own fallback.

**Entry and navigation.** Invitation is a link rather than a code, and the code no longer appears in the interface; sign-up and log-in dropped the invitation-code field. An invitee opening the link enters with no account at all — in this static build the same path is reachable by appending `#join/MESH-27K8` to the URL. The five-step progress bar and the mobile "Next: …" hint are gone, leaving the sidebar as the only navigation; the breadcrumb now carries room identity, and a **Result** item appears once something is published. The auth step no longer depends on form submission, because sandboxed preview panes commonly withhold `allow-forms` and swallow the submit event.

**Controls.** The participation-rule radios are visible again — V3 had made them screen-reader-only, leaving a faint border as the only selected state. Disabled controls dropped `opacity:.42` for solid colours that meet contrast, drawn with an inset shadow so the disabled state does not change a control's size. Transient feedback moved off the "Create room" button to the bottom-left of the working area.

**Copy.** Eleven policy-style footnotes were removed and about thirty shortened; prototype-voice strings ("Prototype record: …") and the invite modal's session-switching preview affordance are gone.

**Type and component specs.** Measured across 1028 rendered elements in 13 screens and states: type sizes 13 → 6, font weights 8 → 3, body greys 8 → 2, button heights 6 → 2, input specs 7 → 1, card radii 5 → 1, card padding 6 → 2, status pills 2 → 1. Line heights are now bound to size.

Two of those were defects rather than inconsistencies. The status pill on the Now card was hardcoded blue, so "1 item open" and "Ready to publish" rendered identically to "Getting started". And the four inputs in the "Propose a change" modal had no styling at all — the base rule covered `select` and `datetime-local` but not plain text inputs.

Enforcement is a CSS token layer plus a computed-style sweep after each render, needed because the file carries several layers of `!important` that selectors alone cannot reach. Note that inline styles set from script do not override `!important`; the sweep uses `setProperty(…, 'important')`.

**Verified** in headless Chromium at 1440px and 390px with zero console errors, across: creator flow end to end, invitee entry by link, sign-up and log-in toggling, Google sign-in, form validation, unavailability, proposed change with support and withdrawal, publish and result, and a second coordination round. Additional checks confirm every copy rule still matches live text, no element was left empty by a deletion, and the auth path works inside a sandboxed iframe without `allow-forms`.

## Prototype limits

This is a static high-fidelity demonstration. Room links, login, multiple members, support records, notifications, and privacy enforcement are not live services in the deployed prototype.

The corresponding in-progress implementation lives in `choicemesh-mvp/`. It contains the Supabase schema, authentication foundation, DeepSeek private-draft endpoint, and server-side rule contracts. Served from that app as `/demo/index.html`, the private-draft extraction calls the real endpoint; the browser-side regex remains the offline fallback. No API keys or participant data are included in this repository.

## Run locally

Open [index.html](index.html) in a browser. No local server is required. Append `#join/MESH-27K8` to the URL to see what an invitee sees.
