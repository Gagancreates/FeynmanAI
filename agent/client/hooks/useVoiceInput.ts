import { useRef, useState, useCallback, useEffect } from 'react'

const SILENCE_THRESHOLD = 15 // avg frequency amplitude (0-255) below which = silence
const SILENCE_DURATION_MS = 1500 // 1.5s of silence triggers end-of-speech

export function useVoiceInput(onTranscript: (text: string) => void) {
	const [isMuted, setIsMuted] = useState(true)
	const [isListening, setIsListening] = useState(false)
	const [isProcessing, setIsProcessing] = useState(false)

	const mediaRecorderRef = useRef<MediaRecorder | null>(null)
	const analyserRef = useRef<AnalyserNode | null>(null)
	const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const chunksRef = useRef<Blob[]>([])
	const animFrameRef = useRef<number | null>(null)
	const streamRef = useRef<MediaStream | null>(null)

	const stopEverything = useCallback(() => {
		if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
		if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
		if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop()
		streamRef.current?.getTracks().forEach((t) => t.stop())
		analyserRef.current = null
		silenceTimerRef.current = null
		animFrameRef.current = null
		setIsListening(false)
	}, [])

	const startListening = useCallback(async () => {
		chunksRef.current = []

		const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
		streamRef.current = stream

		// Silence detection via Web Audio API
		const audioCtx = new AudioContext()
		const source = audioCtx.createMediaStreamSource(stream)
		const analyser = audioCtx.createAnalyser()
		analyser.fftSize = 512
		source.connect(analyser)
		analyserRef.current = analyser

		const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
		mediaRecorderRef.current = mediaRecorder

		mediaRecorder.ondataavailable = (e) => {
			if (e.data.size > 0) chunksRef.current.push(e.data)
		}

		mediaRecorder.onstop = async () => {
			const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
			if (audioBlob.size < 1000) {
				// Too small — likely just mic noise, ignore
				if (!isMuted) startListening()
				return
			}

			setIsProcessing(true)
			try {
				const formData = new FormData()
				formData.append('audio', audioBlob, 'recording.webm')
				console.log('[STT] Sending audio blob, size:', audioBlob.size)
				const res = await fetch('/stt', { method: 'POST', body: formData })
				console.log('[STT] Response status:', res.status)
				const json = await res.json() as { transcript: string; error?: string; status?: number }
				console.log('[STT] Response body:', json)
				if (json.error) console.error('[STT] Sarvam error:', json.status, json.error)
				const transcript = json.transcript
				if (transcript?.trim()) onTranscript(transcript.trim())
				else console.warn('[STT] Empty transcript received')
			} catch (err) {
				console.error('[STT] Error:', err)
			} finally {
				setIsProcessing(false)
				// Auto-resume listening after processing (if still unmuted)
				if (!isMuted) startListening()
			}
		}

		mediaRecorder.start()
		setIsListening(true)

		// Poll analyser for silence
		const dataArray = new Uint8Array(analyser.frequencyBinCount)
		const checkSilence = () => {
			if (!analyserRef.current) return
			analyser.getByteFrequencyData(dataArray)
			const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length

			if (volume < SILENCE_THRESHOLD) {
				if (!silenceTimerRef.current) {
					silenceTimerRef.current = setTimeout(() => {
						silenceTimerRef.current = null
						mediaRecorder.stop()
						stream.getTracks().forEach((t) => t.stop())
						setIsListening(false)
					}, SILENCE_DURATION_MS)
				}
			} else {
				if (silenceTimerRef.current) {
					clearTimeout(silenceTimerRef.current)
					silenceTimerRef.current = null
				}
			}
			animFrameRef.current = requestAnimationFrame(checkSilence)
		}
		checkSilence()
	}, [isMuted, onTranscript])

	const toggleMute = useCallback(() => {
		setIsMuted((prev) => {
			const next = !prev
			if (next) {
				stopEverything()
			} else {
				startListening()
			}
			return next
		})
	}, [startListening, stopEverything])

	// Called by TTS — mutes mic while agent is speaking, unmutes when done
	const muteMic = useCallback(() => {
		stopEverything()
		setIsMuted(true)
	}, [stopEverything])

	const unmuteMic = useCallback(() => {
		setIsMuted(false)
		startListening()
	}, [startListening])

	// Auto-mute when TTS starts, auto-unmute when TTS ends
	useEffect(() => {
		const onTTSStart = () => {
			stopEverything()
			setIsMuted(true)
		}
		const onTTSEnd = () => {
			setIsMuted(false)
			startListening()
		}
		window.addEventListener('tts-start', onTTSStart)
		window.addEventListener('tts-end', onTTSEnd)
		return () => {
			window.removeEventListener('tts-start', onTTSStart)
			window.removeEventListener('tts-end', onTTSEnd)
		}
	}, [stopEverything, startListening])

	return { isMuted, isListening, isProcessing, toggleMute, muteMic, unmuteMic }
}
