import { shallowRef } from 'vue'

/** What a virtual keyboard types into. */
export interface TextTarget {
  insert(text: string): void
  deleteBackward(): void
  submit(): void
  /** The text before the caret (to know whether dictated words need a space). */
  textBeforeCaret(): string
}

/**
 * The text field the user last focused. <XrKeyboard> without a v-model
 * types into it. A field stays the target after it loses DOM focus (a mouse
 * click on a key blurs it), until another field is focused or it unmounts.
 */
export const activeTextTarget = shallowRef<TextTarget>()
