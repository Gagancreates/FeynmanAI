import { useRef, useCallback } from 'react'

export function useVoiceOutput(onStart: () => void, onEnd: () => void) {
	const isPlayingRef = useRef(false)
	const audioCtxRef = useRef<AudioContext | null>(null)
	const queueRef = useRef<{ text: string; languageCode: string }[]>([])

	const playNext = useCallback(async () => {
		if (queueRef.current.length === 0) {
			isPlayingRef.current = false
			;(window as any).__detectedLanguage = 'en-IN' // reset after each speaking cycle
			onEnd()
			window.dispatchEvent(new CustomEvent('tts-end'))
			return
		}

		const item = queueRef.current.shift()!

		try {
			const res = await fetch('/tts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: item.text, language_code: item.languageCode }),
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
			source.onended = () => playNext()
			source.start()
		} catch (e) {
			console.error('[TTS] playback failed', e)
			playNext()
		}
	}, [onEnd])

	const speak = useCallback(
		(text: string, languageCode = 'en-IN') => {
			queueRef.current.push({ text, languageCode })
			if (!isPlayingRef.current) {
				isPlayingRef.current = true
				onStart()
				window.dispatchEvent(new CustomEvent('tts-start'))
				playNext()
			}
		},
		[onStart, playNext]
	)

	const stop = useCallback(() => {
		queueRef.current = []
		isPlayingRef.current = false
		audioCtxRef.current?.close()
		audioCtxRef.current = null
		window.dispatchEvent(new CustomEvent('tts-end'))
	}, [])

	return { speak, stop }
}
