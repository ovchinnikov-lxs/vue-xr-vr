---
name: headset-check
description: After pushing a change that only a real Quest 3 can confirm, tell Aleksandr exactly what to test in the headset and record the result on the issue.
---

# Headset check

The emulator cannot show: text sharpness at distance, how easy a target is
to poke with a real finger, hand-tracking jitter, frame rate, passthrough.

1. Wait for the Vercel deploy of the pushed commit (Vercel MCP
   `list_deployments` for project `vue-xr-vr`, state READY).
2. Message Aleksandr in Russian, 3–6 numbered steps, each one action and
   what he should see, e.g.:
   1. Открой https://vue-xr-vr.vercel.app в браузере Quest, нажми Enter VR.
   2. Вкладка Controls: ткни пальцем Sound — переключатель должен щёлкнуть, слайдер стать серым.
   Ask for a yes/no per step, and a photo or video when something is off.
3. Add the `needs-headset` label to the issue (GitHub MCP `issue_write`).
4. When he confirms, remove the label and close the issue; when not, turn
   his answer into a bug issue in `.github/roadmap.yml` or on GitHub.
