# The Gilded Vault — 3 relics, 4 guards, 1 getaway

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Jo3st4r/best-heist-game-20261122-bot/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Jo3st4r/best-heist-game-20261122-bot/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**3 relics, 4 guards, 2 cameras, 1 getaway** — slip past the cones and crack the Gilded Vault.

One night, one museum hall. You are the thief. Pocket the Gilded Idol, the Sapphire Mask and the Jade Scarab, then reach the green door — while four guards walk their beats with sweeping vision cones and two cameras sweep the hall. The alarm meter is the game's heartbeat: step into a cone and it climbs; hide in the shadows and it falls. At 100 the hall locks down and every guard sprints at you.

Tools, each at a cost: **smoke bombs** (Q, 3) hide you in a cloud, **EMP pulses** (E, 2) blind the cameras for 8 seconds, and **sprinting** (Shift) is fast but loud — guards nearby turn toward the noise. Several routes cross the hall: the shadow lane down the middle, the wings past the display cases, or straight up the crimson runner if you are feeling lucky.

## Play

```sh
node serve.ts   # then open http://localhost:8080
```

Move with WASD or arrow keys. Grab a relic by walking over it. Get all three, then reach the green EXIT door. Three lives; a guard laying hands on you costs one. Ghost bonus (+400) if you never trip lockdown.

Built for [make.fun](https://make.fun/bounty/best-heist-game-20261122-0559) — a top-down 2D canvas heist game, static files only, no network requests.
