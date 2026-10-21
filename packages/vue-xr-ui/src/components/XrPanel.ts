import { defineComponent, type PropType } from 'vue'
import { Container } from '@pmndrs/uikit'
import { pixelSizeAt } from '@vue-xr-ui/tokens'
import { useXrTheme } from '../composables/useXrTheme'
import { useUikitNode } from '../runtime/node'
import { layoutProps, layoutToUikit, space } from '../runtime/layout'

/**
 * A floating surface: background, rounded corners, padding, readable text
 * defaults. Usually the root of a piece of UI placed in the world:
 *
 * ```vue
 * <XrPanel :position="[0, 1.4, -1]" :width="480">...</XrPanel>
 * ```
 *
 * `position`, `rotation` and `scale` are forwarded to the three.js object.
 */
export const XrPanel = defineComponent({
  name: 'XrPanel',
  inheritAttrs: false,
  props: {
    ...layoutProps,
    variant: { type: String as PropType<'surface' | 'raised' | 'sunken'>, default: 'surface' },
    /** Reading distance in metres for a root panel. Scales it to keep the same angular size. */
    distance: Number,
    /** Lit material preset for the background. */
    material: String as PropType<'glass' | 'metal' | 'plastic'>,
  },
  setup(props, { slots }) {
    const theme = useXrTheme()
    const { render } = useUikitNode(
      (initial) => new Container(initial),
      ({ isRoot }) => {
        const t = theme.value
        const background = { surface: t.colors.surface, raised: t.colors.surfaceRaised, sunken: t.colors.surfaceSunken }[props.variant]
        return {
          ...(isRoot ? { pixelSize: pixelSizeAt(props.distance ?? t.viewingDistance) } : {}),
          backgroundColor: background,
          borderRadius: t.radius.lg,
          borderWidth: 1,
          borderColor: t.colors.border,
          padding: space(t, 5),
          gap: space(t, 4),
          color: t.colors.text,
          fontSize: t.typography.body.fontSize,
          lineHeight: t.typography.body.lineHeight,
          ...(props.material ? { panelMaterialClass: props.material } : {}),
          ...layoutToUikit(t, props),
          ...props.ui,
        }
      },
    )
    return () => render(slots.default?.())
  },
})
