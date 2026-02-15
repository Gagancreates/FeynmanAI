import { Environment } from '../environment'

// Gemini TTS returns raw PCM (16-bit little-endian, 24000 Hz, mono).
// Browsers can't decode raw PCM — we prepend a WAV header so decodeAudioData works.
function pcmToWav(pcm: Uint8Array, sampleRate = 24000, channels = 1, bitsPerSample = 16): Uint8Array {
	const dataLen = pcm.length
	const buf = new ArrayBuffer(44 + dataLen)
	const v = new DataView(buf)
	const str = (off: number, s: string) => {
		for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i))
	}

	str(0, 'RIFF')
	v.setUint32(4, 36 + dataLen, true)
	str(8, 'WAVE')
	str(12, 'fmt ')
	v.setUint32(16, 16, true)                                       // chunk size
	v.setUint16(20, 1, true)                                        // PCM format
	v.setUint16(22, channels, true)
	v.setUint32(24, sampleRate, true)
	v.setUint32(28, (sampleRate * channels * bitsPerSample) / 8, true) // byte rate
	v.setUint16(32, (channels * bitsPerSample) / 8, true)           // block align
	v.setUint16(34, bitsPerSample, true)
	str(36, 'data')
	v.setUint32(40, dataLen, true)

	new Uint8Array(buf).set(pcm, 44)
	return new Uint8Array(buf)
}

export async function handleTTS(request: Request, env: Environment): Promise<Response> {
	const { text } = await request.json<{ text: string }>()

	const response = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${env.GOOGLE_API_KEY}`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contents: [{ parts: [{ text }] }],
				generationConfig: {
					response_modalities: ['AUDIO'],
					speech_config: {
						voice_config: {
							prebuilt_voice_config: { voice_name: 'Charon' },
						},
					},
				},
			}),
		}
	)

	if (!response.ok) {
		const errText = await response.text()
		console.error('[TTS] Gemini error', response.status, errText)
		return new Response(`TTS failed: ${errText}`, { status: 502 })
	}

	const data = (await response.json()) as Record<string, unknown>

	const candidates = data.candidates as Array<{
		content: {
			parts: Array<{
				inlineData?: { mimeType: string; data: string }
				inline_data?: { mimeType: string; data: string }
			}>
		}
	}>

	if (!candidates?.[0]) {
		console.error('[TTS] no candidates:', JSON.stringify(data))
		return new Response('TTS error: no candidates', { status: 502 })
	}

	const part = candidates[0].content.parts[0]
	const inlineData = part.inlineData ?? part.inline_data

	if (!inlineData?.data) {
		console.error('[TTS] no audio data:', JSON.stringify(part))
		return new Response('TTS error: no audio data', { status: 502 })
	}

	console.log('[TTS] mimeType:', inlineData.mimeType)

	// Decode base64 → raw PCM bytes
	const binary = atob(inlineData.data)
	const pcm = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) {
		pcm[i] = binary.charCodeAt(i)
	}

	// Wrap in WAV header so the browser can decode it
	const wav = pcmToWav(pcm)

	return new Response(wav, {
		headers: { 'Content-Type': 'audio/wav' },
	})
}
