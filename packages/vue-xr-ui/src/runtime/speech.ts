/**
 * Speech to text for <XrKeyboard>'s microphone key.
 *
 * A recognizer listens until `stop()` (or until it hears the end of a
 * phrase) and reports text through the callbacks. Two come with the kit:
 *
 * - `webSpeechRecognizer()`: the browser's Web Speech API. Free and needs no
 *   server, but not every browser has it (Chrome and Edge do; Firefox does
 *   not), and some expose it but fail when asked to listen.
 * - `recordingRecognizer(transcribe)`: records the microphone and hands the
 *   audio to your own function (a Whisper endpoint, a cloud STT service).
 *   Works wherever `getUserMedia` does, the Quest Browser included.
 */
export interface XrSpeechRecognizer {
  start(session: XrSpeechSession): XrSpeechHandle
}

export interface XrSpeechSession {
  /** BCP 47 language of the active keyboard layout, e.g. "ru-RU". */
  lang: string
  /** Words heard so far, not final yet (shown on the space bar). */
  onPartial(text: string): void
  /** Final text, typed into the field. */
  onResult(text: string): void
  /** A failure: no permission, no network, nothing heard... */
  onError(error: string): void
  /** Listening stopped, after a result, an error or `stop()`. Called once. */
  onEnd(): void
}

export interface XrSpeechHandle {
  /** Stop listening and deliver what was heard. */
  stop(): void
}

interface WebSpeechResult {
  isFinal: boolean
  0: { transcript: string }
}
interface WebSpeech {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: { resultIndex: number; results: ArrayLike<WebSpeechResult> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}
type WebSpeechConstructor = new () => WebSpeech

/** The browser's Web Speech API, or undefined if it has none. */
export function webSpeechRecognizer(): XrSpeechRecognizer | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as { SpeechRecognition?: WebSpeechConstructor; webkitSpeechRecognition?: WebSpeechConstructor }
  const Recognition = w.SpeechRecognition ?? w.webkitSpeechRecognition
  if (!Recognition) return undefined
  return {
    start(session) {
      const recognition = new Recognition()
      recognition.lang = session.lang
      recognition.interimResults = true
      recognition.continuous = false
      let ended = false
      recognition.onresult = (event) => {
        let partial = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]!
          if (result.isFinal) session.onResult(result[0].transcript)
          else partial += result[0].transcript
        }
        session.onPartial(partial)
      }
      // "no-speech" and "aborted" are not failures the user needs to see.
      recognition.onerror = (event) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') session.onError(event.error)
      }
      recognition.onend = () => {
        if (ended) return
        ended = true
        session.onEnd()
      }
      try {
        recognition.start()
      } catch (error) {
        session.onError(String(error))
        ended = true
        session.onEnd()
      }
      return { stop: () => recognition.stop() }
    },
  }
}

/**
 * Records the microphone until `stop()` and passes the audio to
 * `transcribe`, which returns the text (from your server, Whisper, etc.).
 *
 * ```ts
 * const voice = recordingRecognizer(async (audio, lang) => {
 *   const body = new FormData()
 *   body.append('file', audio)
 *   body.append('lang', lang)
 *   return (await (await fetch('/api/transcribe', { method: 'POST', body })).json()).text
 * })
 * ```
 */
export function recordingRecognizer(transcribe: (audio: Blob, lang: string) => Promise<string>): XrSpeechRecognizer {
  return {
    start(session) {
      let recorder: MediaRecorder | undefined
      let stream: MediaStream | undefined
      let stopped = false
      const chunks: Blob[] = []
      const finish = () => stream?.getTracks().forEach((t) => t.stop())

      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((s) => {
          stream = s
          if (stopped) return (finish(), session.onEnd())
          recorder = new MediaRecorder(s)
          recorder.ondataavailable = (e) => chunks.push(e.data)
          recorder.onstop = async () => {
            finish()
            session.onPartial('…')
            try {
              const text = await transcribe(new Blob(chunks, { type: recorder!.mimeType }), session.lang)
              if (text) session.onResult(text)
            } catch (error) {
              session.onError(String(error))
            }
            session.onEnd()
          }
          recorder.start()
        })
        .catch((error: unknown) => {
          session.onError(error instanceof DOMException ? error.name : String(error))
          session.onEnd()
        })

      return {
        stop() {
          stopped = true
          if (recorder?.state === 'recording') recorder.stop()
        },
      }
    },
  }
}
