import { FormEventHandler, useCallback, useRef, useState } from 'react'
import { useAgent } from '../agent/TldrawAgentAppProvider'
import { useVoiceInput } from '../hooks/useVoiceInput'
import { ChatHistory } from './chat-history/ChatHistory'
import { ChatInput } from './ChatInput'
import { TodoList } from './TodoList'

export function ChatPanel() {
	const agent = useAgent()
	const inputRef = useRef<HTMLTextAreaElement>(null)
	const [lastTranscript, setLastTranscript] = useState('')

	const sendToAgent = useCallback(
		(value: string) => {
			if (!value.trim()) return
			agent.interrupt({
				input: {
					agentMessages: [value],
					bounds: agent.editor.getViewportPageBounds(),
					source: 'user',
					contextItems: agent.context.getItems(),
				},
			})
		},
		[agent]
	)

	const { isMuted, isListening, isProcessing, toggleMute } = useVoiceInput((transcript, languageCode) => {
		setLastTranscript(transcript)
		// Store detected language globally so TTS can use it
		;(window as any).__detectedLanguage = languageCode
		sendToAgent(transcript)
	})

	const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
		async (e) => {
			e.preventDefault()
			if (!inputRef.current) return
			const formData = new FormData(e.currentTarget)
			const value = formData.get('input') as string

			if (value === '') {
				agent.cancel()
				return
			}

			inputRef.current.value = ''
			sendToAgent(value)
		},
		[agent, sendToAgent]
	)

	const handleNewChat = useCallback(() => {
		agent.reset()
		setLastTranscript('')
	}, [agent])

	return (
		<>
			{/* Floating mic overlay on canvas — bottom left */}
			<div className="mic-overlay">
				<button
					className={`mic-overlay-button ${isListening ? 'mic-listening' : isProcessing ? 'mic-processing' : isMuted ? 'mic-muted' : 'mic-idle'}`}
					onClick={toggleMute}
					title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
				>
					{isProcessing ? (
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
							<circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="22" strokeLinecap="round">
								<animateTransform attributeName="transform" type="rotate" from="0 10 10" to="360 10 10" dur="0.8s" repeatCount="indefinite" />
							</circle>
						</svg>
					) : isMuted ? (
						<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
							<path d="M10 2a3.5 3.5 0 0 0-3.5 3.5v5a3.5 3.5 0 0 0 7 0v-5A3.5 3.5 0 0 0 10 2z" opacity="0.35"/>
							<path d="M5 8.5a.75.75 0 0 0-1.5 0v2A6.5 6.5 0 0 0 9.25 17v1.75H7a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5h-2.25V17A6.5 6.5 0 0 0 16.5 10.5v-2a.75.75 0 0 0-1.5 0v2a5 5 0 0 1-10 0v-2z" opacity="0.35"/>
							<line x1="3" y1="3" x2="17" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
						</svg>
					) : (
						<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
							<path d="M10 2a3.5 3.5 0 0 0-3.5 3.5v5a3.5 3.5 0 0 0 7 0v-5A3.5 3.5 0 0 0 10 2z"/>
							<path d="M5 8.5a.75.75 0 0 0-1.5 0v2A6.5 6.5 0 0 0 9.25 17v1.75H7a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5h-2.25V17A6.5 6.5 0 0 0 16.5 10.5v-2a.75.75 0 0 0-1.5 0v2a5 5 0 0 1-10 0v-2z"/>
						</svg>
					)}
				</button>
				{lastTranscript && (
					<div className="mic-overlay-transcript">"{lastTranscript}"</div>
				)}
				<span className="mic-overlay-status">
					{isListening ? 'Listening...' : isProcessing ? 'Processing...' : isMuted ? 'Mic off' : 'Ready'}
				</span>
			</div>

			<div className="chat-panel tl-theme__dark">
				<div className="chat-header">
					<button className="new-chat-button" onClick={handleNewChat}>
						+
					</button>
				</div>
				<ChatHistory agent={agent} />
				<div className="chat-input-container">
					<TodoList agent={agent} />
					<ChatInput handleSubmit={handleSubmit} inputRef={inputRef} />
				</div>
			</div>
		</>
	)
}
