import { shallowRef } from 'vue'
import type { Object3D } from 'three'

/** What a virtual keyboard types into. */
export interface TextTarget {
  insert(text: string): void
  deleteBackward(): void
  submit(): void
  /** The text before the caret (to know whether dictated words need a space). */
  textBeforeCaret(): string
  /** The field's node: a modal dialog keeps focus away from fields outside it. */
  node?: Object3D
  focus?(): void
  blur?(): void
  /** Has DOM focus now (not only "is the last focused field"). */
  focused?(): boolean
}

/**
 * The text field the user last focused. <XrKeyboard> without a v-model
 * types into it. A field stays the target after it loses DOM focus (a mouse
 * click on a key blurs it), until another field is focused or it unmounts.
 */
export const activeTextTarget = shallowRef<TextTarget>()
