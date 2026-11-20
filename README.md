[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/sipenhd/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/sipenhd/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Solmar Bay — an open-world crime game

Sun, salt air, and a city that never stops moving. **Marisol Vega** drove getaway cars once. Then she quit — until the rent came due. Now Rosa needs a driver, the Greycoats want the streets, and Solmar Bay is about to find out what Marisol can do behind a wheel.

Drive and walk a sunset coastal city — Old Harbor, Palm Row, the Neon Strip, the Docks, the Hills — steal cars, outrun the police, and finish all five story jobs. Pure static files, no network, no build step.

## How to run

```sh
node serve.ts
# open http://localhost:8080
```

Desktop Chrome, keyboard + mouse.

## Controls

| Input | Action |
| --- | --- |
| WASD / Arrows | Walk, or drive (steer / accelerate / brake) |
| E | Enter / exit car (jack parked and traffic cars) |
| Mouse | Aim · Click — shoot pistol |
| F | Punch |
| Shift | Run · Space — handbrake |
| M | Mute · P / Esc — pause |

## Features

- **Open city** — grid streets with sidewalks, buildings with lit windows and neon, parks, palm-lined beach and harbor piers; smooth follow camera, sunset/dusk tint cycle.
- **Driving** — acceleration, braking, steering, handbrake skids, crash damage and smoke, speedometer and car health.
- **Traffic & pedestrians** — cars drive lanes, stop for cars ahead and turn at intersections; pedestrians walk the sidewalks and flee when scared.
- **Wanted level 0–5 stars** — stealing, hitting pedestrians and shooting raise heat; police cars ram and pursue, officers chase you on foot; wanted decays when you stay out of sight. Busted or wasted means a fine and a respawn.
- **Five story missions** — First Job, Getaway, Harbor Heist, Taxi Rush, and the Showdown against the Greycoat gang — with dialogue, markers, and cash rewards, plus seashell/cash collectibles, health kits and ammo boxes.
- **Combat** — pistol with ammo and mouse aim, fist fighting, rival gang members with health bars who shoot back.
- **HUD** — health, money, wanted stars, ammo, mission tracker, live minimap (player, cars, police, enemies, mission marker, north), speedometer.
- **Save / Continue** — progress, money, mission state and position save to localStorage automatically; continue from the title screen.
- **Sound** — WebAudio only: engine hum, sirens, gunshots, pickup blips and a looping synthwave bassline. No audio files.
