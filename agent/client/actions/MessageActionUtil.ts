import { MessageAction } from '../../shared/schema/AgentActionSchemas'
import { Streaming } from '../../shared/types/Streaming'
import { AgentActionUtil, registerActionUtil } from './AgentActionUtil'

export const MessageActionUtil = registerActionUtil(
	class MessageActionUtil extends AgentActionUtil<MessageAction> {
		static override type = 'message' as const

		override applyAction(action: Streaming<MessageAction>) {
			if (!action.complete) return
			window.dispatchEvent(new CustomEvent('agent-message', { detail: action.text }))
		}

		override getInfo(action: Streaming<MessageAction>) {
			return {
				description: action.text ?? '',
				canGroup: () => false,
			}
		}
	}
)
