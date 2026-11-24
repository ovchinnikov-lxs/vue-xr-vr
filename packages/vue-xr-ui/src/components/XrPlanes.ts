import { defineComponent, h, markRaw, onBeforeUnmount, watch, type PropType } from 'vue'
import { BufferGeometry, DoubleSide, Group, LineBasicMaterial, LineLoop, Mesh, MeshBasicMaterial, Shape, ShapeGeometry, Vector3 } from 'three'
import { useXrFrame } from '../composables/useXrFrame'
import { useXrPlanes } from '../composables/useXrPlanes'
import { useXrTheme } from '../composables/useXrTheme'
import type { XrPlane } from '../runtime/planes'

interface Drawn {
  fill: Mesh
  outline: LineLoop
  changed: number
}

/**
 * Draws the real surfaces the headset found (walls, floor, tables...) as
 * tinted outlines, in a passthrough session. For showing where panels can
 * snap while one is carried, and for debugging a room setup.
 *
 * ```vue
 * <XrPlanes v-if="carrying" :labels="['wall', 'table']" />
 * ```
 */
export const XrPlanes = defineComponent({
  name: 'XrPlanes',
  inheritAttrs: false,
  props: {
    /** Only planes with these labels (`wall`, `floor`, `table`...). All when empty. */
    labels: { type: Array as PropType<readonly string[]>, default: () => [] },
    /** Colour, any CSS colour. The theme's accent by default. */
    color: String,
    /** Opacity of the fill; the outline is drawn three times stronger. */
    opacity: { type: Number, default: 0.12 },
  },
  setup(props, { attrs }) {
    const theme = useXrTheme()
    const planes = useXrPlanes()
    const group = markRaw(new Group())
    const fill = new MeshBasicMaterial({ transparent: true, depthWrite: false, side: DoubleSide })
    const line = new LineBasicMaterial({ transparent: true, depthWrite: false })
    watch(
      () => [props.color ?? theme.value.colors.primary, props.opacity] as const,
      ([color, opacity]) => {
        fill.color.set(color)
        line.color.set(color)
        fill.opacity = opacity
        line.opacity = Math.min(1, opacity * 3)
      },
      { immediate: true },
    )

    const drawn = new Map<XrPlane, Drawn>()
    const remove = (plane: XrPlane) => {
      const d = drawn.get(plane)
      if (!d) return
      group.remove(d.fill, d.outline)
      d.fill.geometry.dispose()
      d.outline.geometry.dispose()
      drawn.delete(plane)
    }

    useXrFrame(() => {
      const shown = planes.value.filter((p) => props.labels.length === 0 || props.labels.includes(p.label))
      const keep = new Set(shown)
      for (const plane of [...drawn.keys()]) if (!keep.has(plane)) remove(plane)
      for (const plane of shown) {
        let d = drawn.get(plane)
        if (d && d.changed !== plane.plane.lastChangedTime) {
          remove(plane)
          d = undefined
        }
        if (!d) {
          d = { ...outlineOf(plane, fill, line), changed: plane.plane.lastChangedTime }
          drawn.set(plane, d)
          group.add(d.fill, d.outline)
        }
        d.fill.visible = d.outline.visible = plane.tracked
        d.fill.matrix.copy(plane.matrix)
        d.outline.matrix.copy(plane.matrix)
      }
    })

    onBeforeUnmount(() => {
      for (const plane of [...drawn.keys()]) remove(plane)
      fill.dispose()
      line.dispose()
    })

    return () => h('primitive', { ...attrs, object: group })
  },
})

function outlineOf(plane: XrPlane, fill: MeshBasicMaterial, line: LineBasicMaterial) {
  // The polygon is in the plane's local x/z: build it in x/y, then lay it down.
  const shape = new Shape(plane.polygon.map((p) => p.clone()))
  const geometry = new ShapeGeometry(shape).rotateX(Math.PI / 2)
  const mesh = new Mesh(geometry, fill)
  const outline = new LineLoop(new BufferGeometry().setFromPoints(plane.polygon.map((p) => new Vector3(p.x, 0.002, p.y))), line)
  for (const object of [mesh, outline]) {
    object.matrixAutoUpdate = false
    // Over the room, under the UI.
    object.renderOrder = -1
    object.raycast = () => {}
  }
  return { fill: mesh, outline }
}
