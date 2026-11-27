import { defineComponent, inject, type PropType } from 'vue'
import { Container } from '@pmndrs/uikit'
import { pixelSizeAt } from '@vue-xr-ui/tokens'
import { useXrTheme } from '../composables/useXrTheme'
import { DoubleSidedPanelMaterial, useUikitNode } from '../runtime/node'
import { SURFACE_HOST, UIKIT_PARENT } from '../runtime/context'
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
    /** Background: `surface` (the panel), `raised` (a card over it) or `sunken` (a well in it). */
    variant: { type: String as PropType<'surface' | 'raised' | 'sunken'>, default: 'surface' },
    /** Reading distance in metres for a root panel. Scales it to keep the same angular size. */
    distance: Number,
    /** Lit material preset for the background. */
    material: String as PropType<'glass' | 'metal' | 'plastic'>,
  },
  setup(props, { slots }) {
    const theme = useXrTheme()
    // A root panel gets the double-sided plate from ROOT_DEFAULTS; so does
    // the panel that is the body of a window or a dialog.
    const host = inject(SURFACE_HOST, undefined)
    const outer = host != null && host === inject(UIKIT_PARENT, undefined)
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
          ...(outer ? { panelMaterialClass: DoubleSidedPanelMaterial } : {}),
          ...(props.material ? { panelMaterialClass: props.material } : {}),
          ...layoutToUikit(t, props),
          ...props.ui,
        }
      },
    )
    return () => render(slots.default?.())
  },
})
