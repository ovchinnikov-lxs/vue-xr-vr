---
'vue-xr-ui': patch
'@vue-xr-ui/tokens': patch
---

Add XrIcon: Lucide icon nodes (`import { Heart } from 'lucide'`) or SVG strings, drawn in the surrounding text colour; outlines are triangulated, since uikit's Svg only fills. XrButton takes an `icon` (and `iconEnd`); without a label it is a round icon button.
