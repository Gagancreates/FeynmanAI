import { Environment } from '../environment'

export async function handleSTT(request: Request, env: Environment): Promise<Response> {
	const formData = await request.formData()

	const sarvamForm = new FormData()
	sarvamForm.append('file', formData.get('audio') as File)
	sarvamForm.append('model', 'saarika:v2.5')
	sarvamForm.append('language_code', 'unknown')

	const response = await fetch('https://api.sarvam.ai/speech-to-text', {
		method: 'POST',
		headers: { 'api-subscription-key': env.SARVAM_API_KEY },
		body: sarvamForm,
	})

	if (!response.ok) {
		const err = await response.text()
		console.error('Sarvam STT error:', response.status, err)
		return Response.json({ transcript: '', error: err, status: response.status }, { status: 500 })
	}

	const data = (await response.json()) as { transcript: string }
	return Response.json({ transcript: data.transcript ?? '' })
}
