# FeynmanAI

A real-time, voice-first AI tutor that teaches on a live canvas. Ask a question by voice, and the tutor speaks back while drawing diagrams, writing equations, and building visual explanations in real time.

<img width="1920" height="1015" alt="Image" src="https://github.com/user-attachments/assets/7ce2fd5d-286d-4eb4-b7c4-e9a52dda68a3" />

<img width="1920" height="1026" alt="Image" src="https://github.com/user-attachments/assets/8d64f75b-efb9-4d8f-9e0c-d398b332608e" />

<img width="1920" height="1016" alt="Image" src="https://github.com/user-attachments/assets/176904b1-8b4c-44a4-8b47-5ac3906ba813" />

## Overview

FeynmanAI pairs a streaming LLM with a live canvas editor and a full voice I/O pipeline. The AI does not just respond with text. It draws, labels, connects, and explains visually while speaking the explanation aloud, replicating the experience of sitting with a knowledgeable tutor at a whiteboard.

Multilingual support is built in. Students can ask questions in English, Hindi, or Kannada and receive spoken explanations in the same language.

## Features

- **Voice-first interaction** - Speak to ask, the tutor responds in speech with silence detection and auto mic mute during playback
- **Live canvas tutoring** - The AI draws diagrams, shapes, arrows, and annotations in real time as it explains concepts
- **Multilingual** - Full voice I/O support for English, Hindi (hi-IN), and Kannada (kn-IN)
- **Streaming responses** - LLM output streams over SSE and canvas actions execute incrementally as they arrive
- **Socratic method** - The tutor checks prior knowledge before explaining and asks comprehension questions mid-session
- **Context-aware** - Select specific shapes or regions from the canvas and include them as context for the next question
- **Model switching** - Switch between Claude, Gemini, and GPT models from the chat panel

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Canvas | tldraw |
| Backend | Cloudflare Workers, Durable Objects |
| LLM | Vercel AI SDK (Anthropic Claude, Google Gemini, OpenAI GPT) |
| TTS | Google Gemini 2.5 Flash TTS |
| STT | Sarvam AI (saarika:v2.5) |
| Audio | Web Audio API (PCM streaming, WAV decode) |
| Streaming | Server-Sent Events (SSE) with chunked transfer |

## Architecture

The backend runs on Cloudflare Workers with a Durable Object per user session. The LLM streams JSON action sequences over SSE. The client parses these incrementally and executes canvas actions (create, move, draw, label, etc.) as each action arrives, without waiting for the full response.

Voice input is recorded via MediaRecorder with frequency-based silence detection. The audio blob is sent to Sarvam AI for transcription. The transcribed text is injected into the agent prompt with the detected language tag. The agent's spoken response is sent to the Gemini TTS endpoint, which returns raw PCM audio that is wrapped in a WAV header and played through the Web Audio API.

## Getting Started

### Prerequisites

- Node.js 18+
- Cloudflare account with Workers enabled
- API keys: Anthropic, Google (Gemini), OpenAI, Sarvam AI

### Setup

```bash
cd agent
npm install
```

Create a `.dev.vars` file in the `agent/` directory:

```
ANTHROPIC_API_KEY=your_key
GOOGLE_API_KEY=your_key
OPENAI_API_KEY=your_key
SARVAM_API_KEY=your_key
```

### Run locally

```bash
npm run dev
```

### Deploy

```bash
npx wrangler deploy
```

Set secrets in Cloudflare dashboard or via `wrangler secret put`.

## License

MIT
