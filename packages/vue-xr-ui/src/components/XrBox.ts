import { defineComponent } from 'vue'
import { Container } from '@pmndrs/uikit'
import { pixelSizeAt } from '@vue-xr-ui/tokens'
import { useXrTheme } from '../composables/useXrTheme'
import { useUikitNode } from '../runtime/node'
import { layoutProps, layoutToUikit } from '../runtime/layout'

/** A transparent flex container, the `<div>` of vue-xr-ui. */
export const XrBox = defineComponent({
  name: 'XrBox',
  inheritAttrs: false,
  props: {
    ...layoutProps,
    /** Only for a root box: the reading distance in metres, which sets its world scale. */
    distance: Number,
  },
  setup(props, { slots }) {
    const theme = useXrTheme()
    const { render } = useUikitNode(
      (initial) => new Container(initial),
      ({ isRoot }) => ({
        ...(isRoot ? { pixelSize: pixelSizeAt(props.distance ?? theme.value.viewingDistance) } : {}),
        ...layoutToUikit(theme.value, props),
        ...props.ui,
      }),
    )
    return () => render(slots.default?.())
  },
})
