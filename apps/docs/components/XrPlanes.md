# <code>&lt;XrPlanes&gt;</code>

Draws the real surfaces the headset found (walls, floor, tables, from the room setup on a Quest 3) as tinted outlines in a passthrough session. Show it while the user carries a window that snaps, so they see where it can go, or to check a room setup. It draws nothing outside a session or on devices without plane detection.

## Usage

```vue
<XrPlanes :labels="['wall', 'table']" />
<XrPlanes color="#22c55e" :opacity="0.2" />
```

For the planes themselves (to place content on the table, count the walls), use the composable:

```ts
import { useXrPlanes, useXrFrame } from 'vue-xr-ui'

const planes = useXrPlanes()
const table = computed(() => planes.value.find((p) => p.label === 'table'))
useXrFrame(() => {
  // matrix, center and normal are world space and update every frame
  if (table.value?.tracked) lamp.position.copy(table.value.center)
})
```

Each plane has `label` (`wall`, `floor`, `ceiling`, `table`, `couch`, `window`, `door`, `wall art`, `other`...), `orientation`, `matrix` (plane to world: the plane lies in its local x/z, +y is the normal), `polygon`, `min` / `max`, `center`, `normal` and `tracked`.

## API

<!--@include: ./api/XrPlanes.md-->
