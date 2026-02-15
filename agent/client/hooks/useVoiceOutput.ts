import { useRef, useCallback } from 'react'

export function useVoiceOutput(onStart: () => void, onEnd: () => void) {
	const isPlayingRef = useRef(false)
	const audioCtxRef = useRef<AudioContext | null>(null)

	const speak = useCallback(
		async (text: string) => {
			if (isPlayingRef.current) return
			isPlayingRef.current = true
			onStart()
			window.dispatchEvent(new CustomEvent('tts-start'))

			try {
				const res = await fetch('/tts', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ text }),
				})

				const arrayBuffer = await res.arrayBuffer()

				if (!audioCtxRef.current) {
					audioCtxRef.current = new AudioContext()
				}
				const audioCtx = audioCtxRef.current
				const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
				const source = audioCtx.createBufferSource()
				source.buffer = audioBuffer
				source.connect(audioCtx.destination)
				source.onended = () => {
					isPlayingRef.current = false
					onEnd()
					window.dispatchEvent(new CustomEvent('tts-end'))
				}
				source.start()
			} catch (e) {
				console.error('[TTS] playback failed', e)
				isPlayingRef.current = false
				onEnd()
				window.dispatchEvent(new CustomEvent('tts-end'))
			}
		},
		[onStart, onEnd]
	)

	const stop = useCallback(() => {
		isPlayingRef.current = false
		audioCtxRef.current?.close()
		audioCtxRef.current = null
		window.dispatchEvent(new CustomEvent('tts-end'))
	}, [])

	return { speak, stop }
}
