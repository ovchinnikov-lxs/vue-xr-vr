Controller profiles from [`@webxr-input-profiles/assets@1.0.20`](https://github.com/immersive-web/webxr-input-profiles)
(MIT), served to the e2e tests instead of the jsDelivr CDN so the tests run
offline and do not depend on a third-party service. Only what the emulated
Quest 3 asks for is included: its controllers (`meta-quest-touch-plus`) and
hands (`generic-hand`).
