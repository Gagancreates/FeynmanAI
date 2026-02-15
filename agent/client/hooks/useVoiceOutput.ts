import { useRef, useCallback } from 'react'

function splitIntoSentences(text: string): string[] {
	return text
		.split(/(?<=[.!?])\s+/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0)
}

export function useVoiceOutput(onStart: () => void, onEnd: () => void) {
	const queueRef = useRef<string[]>([])
	const isPlayingRef = useRef(false)
	const audioCtxRef = useRef<AudioContext | null>(null)

	const playNext = useCallback(async () => {
		if (queueRef.current.length === 0) {
			isPlayingRef.current = false
			onEnd()
			return
		}

		const sentence = queueRef.current.shift()!
		isPlayingRef.current = true

		const res = await fetch('/tts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ text: sentence }),
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
	}, [onEnd])

	const speak = useCallback(
		(text: string) => {
			const sentences = splitIntoSentences(text)
			queueRef.current.push(...sentences)

			if (!isPlayingRef.current) {
				onStart()
				playNext()
			}
		},
		[playNext, onStart]
	)

	const stop = useCallback(() => {
		queueRef.current = []
		isPlayingRef.current = false
		audioCtxRef.current?.close()
		audioCtxRef.current = null
	}, [])

	return { speak, stop }
}
