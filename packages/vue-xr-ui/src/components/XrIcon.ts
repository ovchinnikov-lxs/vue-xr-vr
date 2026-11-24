import { defineComponent, markRaw, onBeforeUnmount, watch, type PropType } from 'vue'
import { Content } from '@pmndrs/uikit'
import { signal } from '@preact/signals-core'
import { DoubleSide, Mesh, MeshBasicMaterial, ShapeGeometry, Vector3, type BufferGeometry } from 'three'
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { useXrTheme } from '../composables/useXrTheme'
import { useUikitNode } from '../runtime/node'

/**
 * An icon as Lucide ships it (`import { Heart } from 'lucide'`): a list of
 * SVG elements, `[tag, attributes]`, drawn on a 24 × 24 grid.
 */
export type XrIconNode = ReadonlyArray<readonly [tag: string, attrs: Readonly<Record<string, string | number | undefined>>]>

/** What XrIcon draws: a Lucide icon node, or a whole `<svg>…</svg>` string. */
export type XrIconSource = XrIconNode | string

interface Parsed {
  mesh: Mesh
  center: Vector3
  size: Vector3
}

const escape = (value: string | number) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** Lucide's defaults: outlines 2 units wide, round ends and joins. */
function toSvg(icon: XrIconSource, strokeWidth: number): string {
  if (typeof icon === 'string') return icon
  const children = icon
    .map(([tag, attrs]) => {
      const list = Object.entries(attrs)
        .filter(([key, value]) => value != null && key !== 'key')
        .map(([key, value]) => `${key}="${escape(value!)}"`)
        .join(' ')
      return `<${tag} ${list}/>`
    })
    .join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${children}</svg>`
  )
}

const loader = new SVGLoader()

/**
 * Turns SVG into one flat mesh. uikit's own <Svg> fills shapes only, and
 * Lucide icons are all outlines (`fill="none"`, `stroke`), so it would draw
 * nothing: strokes are triangulated here with SVGLoader.pointsToStroke.
 */
function parse(svg: string): Parsed | undefined {
  const data = loader.parse(svg)
  const parts: BufferGeometry[] = []
  for (const path of data.paths) {
    const style = path.userData?.style as { fill?: string; stroke?: string } | undefined
    if (style?.fill && style.fill !== 'none') {
      for (const shape of SVGLoader.createShapes(path)) {
        parts.push(new ShapeGeometry(shape))
      }
    }
    if (style?.stroke && style.stroke !== 'none') {
      for (const sub of path.subPaths) {
        const stroke = SVGLoader.pointsToStroke(sub.getPoints(), path.userData!.style as Parameters<typeof SVGLoader.pointsToStroke>[1])
        if (stroke) parts.push(stroke)
      }
    }
  }
  if (parts.length === 0) return undefined
  // Same attributes, all non-indexed, or mergeGeometries refuses.
  const flat = parts.map((g) => {
    const plain = g.index ? g.toNonIndexed() : g
    for (const name of Object.keys(plain.attributes)) if (name !== 'position') plain.deleteAttribute(name)
    if (plain !== g) g.dispose()
    return plain
  })
  const geometry = mergeGeometries(flat)
  flat.forEach((g) => g.dispose())
  const mesh = new Mesh(geometry, new MeshBasicMaterial({ side: DoubleSide, toneMapped: false }))
  // SVG's y axis points down.
  mesh.scale.y = -1

  // Typed as the document, but three returns its root <svg> element.
  const root = data.xml as unknown as Element
  const box = root.getAttribute?.('viewBox')?.split(/[\s,]+/).map(Number)
  let center: Vector3
  let size: Vector3
  if (box?.length === 4 && box.every((n: number) => !isNaN(n))) {
    const [minX, minY, width, height] = box as [number, number, number, number]
    center = new Vector3(minX + width / 2, -minY - height / 2, 0)
    size = new Vector3(width, height, 0.00001)
  } else {
    geometry.computeBoundingBox()
    const b = geometry.boundingBox!
    center = new Vector3((b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, 0)
    size = new Vector3(Math.max(b.max.x - b.min.x, 1e-6), Math.max(b.max.y - b.min.y, 1e-6), 0.00001)
  }
  return { mesh, center, size }
}

/**
 * An icon: a Lucide icon (or any SVG) drawn as a flat mesh in the panel,
 * in the text colour around it unless `color` says otherwise.
 *
 * ```vue
 * <script setup>
 * import { Heart } from 'lucide'
 * </script>
 * <XrIcon :icon="Heart" />
 * <XrButton :icon="Heart" label="Like" />
 * ```
 *
 * Install `lucide` (the plain, framework-free package) and import only the
 * icons you use: vue-xr-ui bundles none. A string is parsed as SVG markup;
 * filled and outlined shapes both work, gradients and text do not.
 */
export const XrIcon = defineComponent({
  name: 'XrIcon',
  inheritAttrs: false,
  props: {
    /** A Lucide icon node (`import { Heart } from 'lucide'`) or an `<svg>` string. */
    icon: { type: [Array, String] as PropType<XrIconSource>, required: true },
    /** Width and height in dmm. */
    size: { type: Number, default: 24 },
    /** Outline width of Lucide icons, in icon units (24 per side). */
    strokeWidth: { type: Number, default: 2 },
    /** Colour; inherits the surrounding text colour by default. */
    color: String,
    /** Draw it in the muted text colour. */
    muted: Boolean,
    /** Escape hatch: raw uikit (`@pmndrs/uikit`) properties, merged last. */
    ui: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  setup(props) {
    const theme = useXrTheme()
    const boundingBox = signal<{ center: Vector3; size: Vector3 } | undefined>(undefined)
    const { node, render } = useUikitNode(
      (initial) => new Content(initial, undefined, { boundingBox, depthWriteDefault: false, remeasureOnChildrenChange: false }),
      () => ({
        width: props.size,
        height: props.size,
        flexShrink: 0,
        // Clicks go to the control around it, never to the icon's mesh.
        pointerEvents: 'none',
        ...(props.color ? { color: props.color } : props.muted ? { color: theme.value.colors.textMuted } : {}),
        ...props.ui,
      }),
    )

    let current: Mesh | undefined
    const clear = () => {
      if (!current) return
      node.remove(current)
      current.geometry.dispose()
      ;(current.material as MeshBasicMaterial).dispose()
      current = undefined
    }
    watch(
      () => toSvg(props.icon, props.strokeWidth),
      (svg) => {
        clear()
        const parsed = parse(svg)
        if (!parsed) {
          boundingBox.value = undefined
          return
        }
        current = markRaw(parsed.mesh)
        boundingBox.value = { center: parsed.center, size: parsed.size }
        node.addUnsafe(current)
        // Gives the mesh the component's colour, clipping and draw order.
        node.notifyAncestorsChanged()
      },
      { immediate: true },
    )
    onBeforeUnmount(clear)

    return () => render()
  },
})
