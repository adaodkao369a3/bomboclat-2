# Studio Bot — Full Build Prompt (6 parts)

Work through the parts **in order**. Finish and verify each part (`npx tsc` clean, `npm test` passing, new tests added) before starting the next. Read the existing code first; follow its conventions. After each part, write a 3-5 line summary of what changed.

---

## PART 1 — Ground rules + foundation

### Ground rules (apply to every part)
- Project: "bomboclat", TypeScript Discord bot (discord.js v14, PostgreSQL, Railway, one instance). Prefix `.` = members, `$` = staff.
- The only currency is **Residuals**. Ignore "Bombo Coins" (a different bot).
- Do **not** change any XP threshold or level formula. Do not touch voice XP or message XP logic.
- Never print, copy, or commit `.env`. Roles are always identified by ID, never by name.
- All DB changes are idempotent migrations (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `CREATE UNIQUE INDEX IF NOT EXISTS`) in the same place the existing schema SQL lives.
- `npm start` runs `tsc`, so a type error crashes the deploy. Keep the build clean.
- The booster ("Guest Star") perks will be redone later. Leave booster code alone except where a part below says otherwise.
- The level perks section of `.level` is intentionally left out for now.

### 1A. Restart-proof interactions
Today every dropdown and button is handled by a `createMessageComponentCollector` held in memory (`commands/shop.ts`, `commands/manage.ts`, `commands/profile.ts`, `commands/residualsLeaderboard.ts`, and any others). They die on restart, and `index.ts` `interactionCreate` has no case for select menus.
- Remove **all** message/channel component collectors.
- Build one interaction router: `customId` format `namespace:action:arg1:arg2`. Register handlers per namespace (`shop`, `manage`, `profile`, `lb`, `reslb`, etc.). Route buttons, string selects and modals from the global `interactionCreate`.
- Where a component belongs to one person (leaderboard pages, profile, manage), encode the owner's user ID in the `customId` and reject others with a short ephemeral reply.
- Anything that used a timeout now checks the message age instead. If expired, reply ephemerally "This menu expired, run the command again" and disable the components.
- `.manage` must not expire after 2 minutes, and `.profile` buttons must not expire after 5.
- Shop messages must keep working after a restart without being reposted.

### 1B. Shared UI style
Create `src/ui/` helpers used by every command below:
- **No backticks** anywhere in user-facing embeds (no grey code boxes). Use **bold** or `__underline__` instead.
- Names are underlined; stats go on the next line as small subtext (`-# ...`). If `-#` does not render inside embed descriptions, fall back to italics.
- One shared cooldown-message helper (use ⏱️ everywhere, replace the animated typing emoji in `.res`).
- A helper that builds the small author header: `setAuthor({ name: displayName, iconURL: avatar })`.

### 1C. One shared command list
Create a single source of truth for public commands (name, description, who can use it: everyone / level or role / owns-a-role / staff). Use it for:
- the `.help` embed,
- the profile "Commands" button,
- generating `COMMAND_REFERENCE.md`.

It must contain only commands that really exist for members. Fix the known mistakes: `.res` listed once, **`.reslb` added**, fake `.residuals` removed (the real one is staff-only `$residuals`), `.shop`, `.reset`, `.xp` removed from member lists (they are staff `$` commands), and no duplicate `.shop` lines. Add `.lvl` as a visible alias of `.level`. Role-based commands (Part 5 and 6) must appear automatically for members who own the role.

### 1D. Support pieces
- Add an alias mechanism to the `Command` interface (`aliases?: string[]`) so `.lvl` can point to `.level`.
- Add a staff log channel setting (same mechanism the existing channel settings in `$channels` / settings use). Provide `logStaffAction(guild, text)` that no-ops if unset.
- Add a small in-memory guild member cache (refresh every ~5 minutes, fall back to cache if Discord rate-limits) used to hide people who left from leaderboards.
- Add `getXPBySource(userId)` in `database/client.ts` returning `{ message, voice }` totals from `xp_transactions` (sources `'message'` and `'voice'`).

---

## PART 2 — Core commands

### `.leaderboard` (XP)
- Pagination, **10 per page, 5 pages = top 50**. Buttons: ⏮ ◀ ▶ ⏭ plus a disabled "Page 2/5" label button. Only the person who ran it can click; use the restart-proof router.
- Layout, one description block (no embed fields, no backticks):
  ```
  🥇 __Name__
  -# Level 42 • 18,450 XP
  ```
- Skip members who left the server (use the guild member cache). Fetch more than 50 rows if needed so 50 still show after filtering.
- Medals for 1-3, plain numbers after.

### `.reslb` (Residuals leaderboard)
- Same visual style and pagination. Its buttons currently use fixed names, so two people running it at once interfere. Fix this with per-owner `customId`s.

### `.res`
- Main line: the **balance**. Under it, smaller: lifetime earned and lifetime spent. Add the member's rank on the residuals leaderboard ("#7 richest").
- Author avatar header + keep the thumbnail. No backticks. Shared cooldown message.

### `.level` (alias `.lvl`)
- Show: level, current role, XP as "1,240 / 2,000 XP", "760 XP to go", and one consistent progress bar (same filled/empty style, not mixed animated and plain emoji).
- Role ladder trimmed to **current role + next two**.
- Show XP earned from chat and voice (label it "Earned from chat and voice"; the two may not add up to total XP because of admin changes and older entries).
- Show the member's XP leaderboard rank.
- No perks section yet. Author avatar header + thumbnail. No backticks.

### `.profile`
- Author avatar header **and** the existing thumbnail (keep both). No backticks.
- Show: level, Residuals, promotion eligibility, plus their archetype role and color role if they own any, and other non-level perks.
- The Commands button uses the shared command list (Part 1C) and the restart-proof router. Back button returns to the profile.

### `.help`
- Rebuild from the shared command list.

### `$rules` split
Currently one `$rules` posts three embeds back to back. Split into three staff commands, each posting only its own embed:
- `$rules` = the server rules embed
- `$rules studio` = the progression/studio embed (how many levels there are, the role ladder)
- `$rules end` = the closing embed

Keep the existing wording and images. Fix any text that still points members to `.level` for perks, and the old "Audience to Lead Cast" wording if present.

Leaderboards get **no** avatar header (they are not personal).

---

## PART 3 — Color shop

### Data
Add columns to `shop_colors`: `price INTEGER`, `tier TEXT`, `min_level INTEGER`, `active BOOLEAN DEFAULT true`, `sort_order INTEGER`. Replace the old `price_band` logic (`COLOR_PRICE_MAP` is duplicated in `services/shop.ts` and `commands/shop.ts`) with the per-color `price` column, and remove the duplicate.

### The 20 colors (names fixed, hex and prices below)

| Tier | Unlocks at level | Color | Hex | Price |
|---|---|---|---|---|
| 1 Studio Classics | 20 | Forest Green | #228B22 | 100 |
| | | Dusty Blue | #6B8BA4 | 100 |
| | | Slate Grey | #708090 | 100 |
| | | Golden Yellow | #FFD700 | 150 |
| | | Cherry Red | #D2042D | 200 |
| | | Lavender Haze | #B7A6D9 | 250 |
| 2 Midnight Cinema | 40 | Midnight Black | #0A0A0F | 300 |
| | | Emerald | #50C878 | 350 |
| | | Sunset Orange | #FF4500 | 400 |
| | | Black Cherry | #6B0F2A | 450 |
| | | Sapphire | #0F52BA | 500 |
| | | Champagne Gold | #E8C872 | 700 |
| 3 Neon Lights | 40 | Toxic Lime | #B6FF00 | 500 |
| | | Plasma Orange | #FF6A00 | 550 |
| | | Cyber Cyan | #00F0FF | 600 |
| | | Laser Pink | #FF2E93 | 650 |
| | | Glitch Magenta | #FF1CF7 | 800 |
| 4 Award Season | 60 | Turquoise | #40E0D0 | 800 |
| | | Pearl Lilac | #DCCBF2 | 900 |
| | | Diamond White | #F0F8FF | 1,200 |

All tier unlock levels and prices live in **one config object** so they are easy to change later.

### Behavior
- Gate by the member's `current_level` from the database (not by Discord roles). Below the unlock level: show the item as locked ("Unlocks at level 40") and refuse the purchase with a clear ephemeral message.
- Layout: one embed per tier, max 6 colors per embed, with its dropdown directly underneath. Keep the color grid image (`generateColorGridImage`). The description shows the tier's unlock level. Dropdown labels show the real per-color price.
- Role names/symbols: one symbol per tier replaces the old band symbols. Colors keep existing Discord roles where the name matches (Forest Green, Golden Yellow, Emerald, Sapphire, Midnight Black, Sunset Orange, Diamond White, Turquoise); update their hex to the new value.
- **Old colors not in the new list** (Crimson Red, Ocean Blue, Royal Purple, Hot Pink, Ruby, Amethyst, Topaz, Aurora Green, Platinum Silver, Galaxy Purple): set `active = false` and hide them from the shop. If a retired color has **zero** owners, delete its row and its Discord role when `$shop` runs. If it has owners, keep it so they can still equip and sell it (refund uses its old price: common 200, uncommon 500, rare 800).
- Selling a color keeps the existing 50% refund, using the stored `price`.
- Fix double-charging: unique index on `user_colors(user_id, color_id)` and lock the user row (`SELECT ... FOR UPDATE`) inside the purchase transaction.
- The booster free-color grant currently checks `price_band === 'common'`. Make that check a safe no-op for now (nothing is free), clearly marked `TODO: booster perks`.
- Posting `$shop color` must edit existing shop messages in place where possible (find them by `customId`) rather than breaking old dropdowns.

---

## PART 4 — Archetype shop (20 lore roles)

Replace all 17 old archetypes (nobody owns any, so nothing needs migrating; remove their rows). The old role gate (`lead_cast`, `audience`, etc.) is dead code in two places in `services/shop.ts`. Replace it with a **level gate** from the database.

### Data
Add to `shop_archetypes`: `min_level INTEGER`, `max_holders INTEGER` (NULL = unlimited), `monthly BOOLEAN DEFAULT false`, `active BOOLEAN DEFAULT true`. Keep one **config file** with the whole table below so numbers are easy to edit.

| Tier | Unlock level | Price | Role (max holders) |
|---|---|---|---|
| Special | 30 | 600 | The Comedian (1, Jujutsu Kaisen) |
| Special | 30 | 750 | CEO of Sex (3, internet humor) |
| Special | 100 | 1,500 per month | Unknown Entity (unlimited, secret role, see Part 6) |
| High-status | 50 | 1,000 | Special Division 4 (5) · The Jedi Council (12) · Straw Hat Pirates (10) · Jobros (5) · Egoists (11) |
| Elite | 70 | 1,800 | The Hashira (9) · The Wizard King (1) · The Seven Shadows (7) · Soul Society (13) · Control Devil (1) · Zoldyck Family (7) · The Immortal Dragon (1) |
| Legendary | 90 | 3,000 | Lord of the Heian Era (1) · The Angels (5) · Witches of Sin (7) · S-Class Heroes (5) · The Espada (10) |

### Behavior
- Server-wide cap per role: count current holders in the database and refuse with "All N spots are taken" when full. Do the count and insert in one transaction with a lock so two simultaneous buyers cannot exceed the cap. Show "3/9 taken" in the shop.
- Keep the existing rule: a member holds **one** archetype at a time; buying another replaces it with a 50% refund of what they paid. Unknown Entity is separate: it does not count toward that limit and has no refund.
- Level gate by `current_level` from the database. Locked items are visible with "Unlocks at level N".
- Layout: one embed per tier, **max 6 roles per embed** with a dropdown under each. Split larger tiers evenly (Elite = 4 + 3, Legendary = 5, High-status = 5, Special = 3).
- Artwork: each archetype looks for `image/<slug>.png` (slug = lowercase name with hyphens). I will add the images later, so a missing file must fall back to a plain embed with no crash.
- Tier symbols in role names, role creation/IDs stored in the database, never matched by name.

---

## PART 5 — Role GIF commands (max 5 per role)

Each archetype role (except Unknown Entity, which has its own powers in Part 6) gets up to **5 GIF commands** that only members who **own that role in the database** can use. Check the purchase record, not just the Discord role.

- Reuse the existing GIF command template in `commands/gif.ts` (targets, caption, cooldown, Klipy search through `fetchGIF`). Each command outputs one GIF built from a search query tied to the lore (e.g. Lord of the Heian Era: `.cleave`, `.domainexpansion`).
- Define all of them in one data file: `{ role, name, query, caption }`. Choose short command names that fit each role's lore.
- Names must be unique and must not clash with any existing command or alias (`.cope`, `.rizz`, etc.). Add a test that fails on any duplicate or clash.
- All queries must be SFW. CEO of Sex's commands must be non-explicit meme-style (boss, money, business). Use the Klipy content filter if the API supports one.
- If the member does not own the role, reply with a short message saying which role unlocks it.
- The shared command list (Part 1C) shows role commands in `.help` and the profile Commands button for owners.
- At the end, include the final list of all commands per role in your report so I can review the names.

---

## PART 6 — Unknown Entity (level 100, monthly)

Theme: strong, detached, rare, like Alien X or Doctor Manhattan.

### Access and expiry
- Visible in the Special tier of the archetype shop for everyone. Buyable from **level 100** for **1,500 Residuals**, unlimited holders.
- Lasts exactly **30 days** from purchase. Add a table `role_expiry(user_id, archetype_id, expires_at)`. A member can buy again only after it expires.
- When it expires, the bot removes the role automatically. Add a check to the existing daily role audit and a short interval check so syncing never gives it back, and so it survives restarts.

### `.perish @user`
- Times out the target for **1 minute**. **3 uses per day** per Unknown Entity holder (shared with `.transform`, resets daily), plus a 1-hour cooldown.
- Cannot target: staff/admins, the server owner, bots, boosters, other Unknown Entity holders, or yourself.
- Announces who used it on whom in the channel. Every use is logged with `logStaffAction`.
- Staff can switch both Unknown Entity powers off server-wide with a setting (`$settings`).

### `.transform @user [uwu|tsundere]`
- Lasts about **2 minutes**. Counts toward the same 3 uses per day. Same target restrictions and staff log as `.perish`. One active transform per channel.
- While active, each plain-text message from the target is **deleted** and reposted by a webhook under the target's display name (with "(transformed)" added) and avatar. The bot has admin, so deleting is fine.
- Rewrite with simple rules, **no AI calls**: uwu = r/l to w, stutters, "nya", small faces; tsundere = phrase list added to the start/end plus hesitations. If no style is given, pick one randomly.
- Webhook posts use `allowedMentions: { parse: [] }` (no @everyone, roles, or user pings). Ignore attachments (leave those messages alone). Webhook messages must **not** award XP and must not retrigger the bot's own handlers.
- Clean up when the timer ends, and if the bot restarts mid-transform, simply end it (store `expires_at`, check it on each message).

---

## Final checklist (after Part 6)
1. `npx tsc` clean, `npm test` passes, with new tests for: pagination boundaries, command-name uniqueness, level gating, holder caps under concurrency, double-click Buy, expiry logic, and the transform text rules.
2. Update `COMMAND_REFERENCE.md` from the shared command list.
3. Report: the files changed, every migration added, the final role command list, anything skipped and why, and the exact deploy steps (e.g. run `$shop` to repost, any slash-command deploy needed).

















