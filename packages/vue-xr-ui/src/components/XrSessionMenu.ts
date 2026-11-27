import { computed, defineComponent, h, inject, onBeforeUnmount, ref, watch, type PropType } from 'vue'
import { useXr } from '../composables/useXr'
import { XR_VIEW } from '../runtime/context'
import { createPalmPose, palmPose } from '../runtime/palm'
import { XrButton } from './XrButton'
import { XrDialog } from './XrDialog'
import { XrText } from './XrText'

/** A pinch counts as a palm pinch when the palm is at most this many degrees off the eyes. */
const PALM_ANGLE = 50

/**
 * The way out of an immersive session for tracked hands: a pinch with the
 * palm turned toward your face (the Quest "menu" gesture) opens a dialog in
 * front of you with **Exit VR** and **Stay**. With controllers, open it
 * through `v-model:open` (from a button).
 *
 * ```vue
 * <XrScene>
 *   <XrSessionMenu />
 * </XrScene>
 * ```
 *
 * Quest Browser is meant to end the session on a left-hand palm pinch
 * itself, but does not always; this makes it dependable. Anything in the
 * default slot goes in the dialog above the buttons (a hint, a recenter
 * tip, settings). `v-model:open` opens it from code too, e.g. from a
 * button.
 *
 * It shares the palm-toward-face pose with an XrHandMenu on the same hand:
 * pass `:gesture="false"` while that menu is open, or put the hand menu on
 * the other hand.
 */
export const XrSessionMenu = defineComponent({
  name: 'XrSessionMenu',
  inheritAttrs: false,
  props: {
    /** Whether the menu is open (`v-model:open`). Without it the menu keeps its own state. */
    open: { type: Boolean, default: undefined },
    /** The hand whose palm pinch opens it: `left` (the Quest menu hand), `right`, or `both`. */
    hand: { type: String as PropType<'left' | 'right' | 'both'>, default: 'left' },
    /** Open on the palm pinch. `false` leaves only `v-model:open`. */
    gesture: { type: Boolean, default: true },
    /** Dialog title. Defaults to "Leave VR?" or "Leave AR?" for the running session. */
    title: String,
    /** Label of the button that ends the session. Defaults to "Exit VR" or "Exit AR". */
    exitLabel: String,
    /** Label of the button that closes the menu and stays. */
    stayLabel: { type: String, default: 'Stay' },
    /** Hint in the dialog when the default slot is empty. */
    hint: { type: String, default: 'You can come back with the Enter button.' },
  },
  emits: {
    /** The menu opened or closed (`v-model:open`). */
    'update:open': (_open: boolean) => true,
    /** Exit was pressed: the session is ending. */
    exit: () => true,
  },
  setup(props, { emit, slots, attrs }) {
    const xr = useXr()
    const view = inject(XR_VIEW, undefined)
    const local = ref(false)
    const isOpen = computed(() => props.open ?? local.value)
    const setOpen = (open: boolean) => {
      local.value = open
      emit('update:open', open)
    }
    const ar = computed(() => xr.mode.value === 'immersive-ar')

    // Palm pinches: checked when the pinch starts (the palm faces the eyes),
    // acted on when it ends, so the same pinch cannot also press something
    // in the dialog that just opened.
    const pose = createPalmPose()
    const armed = new Set<XRInputSource>()
    const handMatches = (source: XRInputSource) =>
      source.hand != null && (props.hand === 'both' || source.handedness === props.hand)
    const onStart = (event: XRInputSourceEvent) => {
      const store = xr.store.value
      if (!props.gesture || !store || !view || !handMatches(event.inputSource)) return
      const palm = palmPose(store, event.frame, event.inputSource.hand!, view, pose)
      if (palm && palm.angleToHead < PALM_ANGLE) armed.add(event.inputSource)
    }
    const onEnd = (event: XRInputSourceEvent) => {
      if (!armed.delete(event.inputSource)) return
      if (!isOpen.value) setOpen(true)
    }
    let session: XRSession | undefined
    const stop = watch(
      () => xr.session.value,
      (next, prev) => {
        session?.removeEventListener('selectstart', onStart)
        session?.removeEventListener('selectend', onEnd)
        armed.clear()
        session = next
        session?.addEventListener('selectstart', onStart)
        session?.addEventListener('selectend', onEnd)
        // A menu left open does not come back in the next session.
        if (!next && prev && isOpen.value) setOpen(false)
      },
      { immediate: true },
    )
    onBeforeUnmount(() => {
      stop()
      session?.removeEventListener('selectstart', onStart)
      session?.removeEventListener('selectend', onEnd)
    })

    const exit = () => {
      setOpen(false)
      emit('exit')
      void xr.exit()
    }

    return () =>
      h(
        XrDialog,
        {
          ...attrs,
          name: (attrs.name as string | undefined) ?? 'session-menu',
          open: isOpen.value && xr.isPresenting.value,
          title: props.title ?? (ar.value ? 'Leave AR?' : 'Leave VR?'),
          width: 400,
          // Only the buttons answer: a stray pinch beside it must not decide.
          closeOnBackdrop: false,
          'onUpdate:open': (open: boolean) => setOpen(open),
        },
        {
          default: () => slots.default?.() ?? [h(XrText, { muted: true, text: props.hint })],
          actions: () => [
            h(XrButton, { name: 'session-stay', variant: 'secondary', label: props.stayLabel, onClick: () => setOpen(false) }),
            h(XrButton, { name: 'session-exit', label: props.exitLabel ?? (ar.value ? 'Exit AR' : 'Exit VR'), onClick: exit }),
          ],
        },
      )
  },
})
