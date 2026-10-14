# Studios Bot Command Reference

| Command | Features |
|---------|----------|
| `.help` | Main help menu with buttons for categories: Profile, Fun, GIF, Shop, Utility - interactive navigation |
| `.profile` / `.profile @user` | View user profile with stats: level, residuals balance, promotion eligibility percentage (15s cooldown) |
| `.level` / `.level @user` | Check current level with XP progress bar and full role progression ladder showing all 17 milestone roles (10s cooldown) |
| `.res` / `.res @user` | View residuals (earnings) balance and breakdown |
| `.leaderboard` | Shows top 5 most active members by level and XP |
| `.rizz` / `.rizz @user1 @user2` | GIF reaction with "rizz anime" - can target up to 3 users (10s cooldown, scales to 120s/180s for 2/3 targets) |
| `.larp` / `.larp @user1 @user2` | GIF reaction with "larp anime" - can target up to 3 users (10s cooldown, scales to 120s/180s for 2/3 targets) |
| `.blush` / `.blush @user1 @user2` | GIF reaction with "anime blush" - can target up to 3 users (10s cooldown, scales to 120s/180s for 2/3 targets) |
| `.cooked` / `.cooked @user1 @user2` | GIF reaction with "cooked anime" - can target up to 3 users (10s cooldown, scales to 120s/180s for 2/3 targets) |
| `.fumble` / `.fumble @user1 @user2` | GIF reaction with "fumble anime" - can target up to 3 users (10s cooldown, scales to 120s/180s for 2/3 targets) |
| `.cope` / `.cope @user1 @user2` | GIF reaction with "cope anime" - can target up to 3 users (10s cooldown, scales to 120s/180s for 2/3 targets) |
| `.grass` / `.grass @user1 @user2` | GIF reaction with "touch grass anime" - can target up to 3 users (10s cooldown, scales to 120s/180s for 2/3 targets) |
| `.aura` / `.aura @user1 @user2` | GIF reaction with "aura anime" - can target up to 3 users (10s cooldown, scales to 120s/180s for 2/3 targets) |
| `.huh` / `.huh @user1 @user2` | GIF reaction with "huh anime" - can target up to 3 users (10s cooldown, scales to 120s/180s for 2/3 targets) |
| `.cry` / `.cry @user1 @user2` | GIF reaction with "crying anime" - can target up to 3 users (10s cooldown, scales to 120s/180s for 2/3 targets) |
| `.leash` / `.leash @user1 @user2` | GIF reaction with "leash anime" - can target up to 3 users (10s cooldown, scales to 120s/180s for 2/3 targets) |
| `.c <query>` | Search for custom GIFs (Featured Extra+ or Guest Star role required) |
| `$clip <prompt>` | Generate AI artwork - art styles: anime, jojos, ghibli, jjk (Director gets full artwork, other admins get summary only with 30min cooldown) |
| `.xp` / `.xp @user` | Check XP points and progression stats |
| `.residuals` / `.residuals @user` | View detailed residuals breakdown including earnings, spending, and transaction history |
| `.residuals-leaderboard` | Shows top users by residuals earnings |
| `$adminhelp` | Admin-only help menu showing restricted commands |
| `.rules` | Display server rules (if configured) |
| `$testwelcome` | Test welcome message for new members (admin only) |
| `$testbooster` | Test booster/Guest Star shoutout message (admin only) |
| `$testlevel` | Test level-up notification message (admin only) |
| `$settings` | Bot settings management menu (admin only) |
| `$shop` | Posts the shop in the configured shop channel (Director only) - can use `$shop color`, `$shop archetype`, or `$shop` for both |
| `$shop color` | Posts only the color shop section (Director only) |
| `$shop archetype` | Posts only the archetype shop section (Director only) |
| `.manage` | Manage shop items and roles - purchase, equip, unequip colors and archetypes, view inventory |
| `.reset` | Reset your profile with caution - clears all progress (use with extreme caution) |
| `$syncroles` | Sync Discord roles with database roles for all users (admin only) |
| Auto-XP on message | Earn 5-15 XP per message (no cooldown, no daily cap) - minimum 3 characters required |
| Auto-role progression | Automatically earn 17 milestone roles as you level up (Spectator → Civilian → Sidekick → ... → Saint at level 150) |
| Auto-welcome | New members receive randomized welcome message with GIF in welcome channel |
| Auto-booster shoutout | Members who boost receive "Guest Star" role, 40 residuals gift, custom GIF access, and red carpet shoutout |
| Emoji submission | Users with 3600+ XP can submit custom emojis for review (via slash command) |
| Shop colors | Purchase colors from shop: Common (200 residuals), Uncommon (500 residuals), Rare (800 residuals) - can own multiple, equip/unequip freely |
| Shop archetypes | Purchase archetypes with tiers: Standard, Legendary, Mythic - different price tiers and role requirements |
| Booster free grants | Boosters get free common color grants and archetype grants as part of Guest Star perks |
| Residuals economy | Earn residuals through various activities, spend in shop, track lifetime earnings/spending |
