import { REST } from '@discordjs/rest'
import { Routes, APIMessage } from 'discord-api-types/v10'

interface NotifyOptions {
	token: string
	channelID: string
}

export type NotifyInstance = ReturnType<typeof Notify>

export default function Notify({ token, channelID }: NotifyOptions) {
	const rest = new REST({ version: '10' }).setToken(token)

	const text = (content: string) => {
		const message: Partial<APIMessage> = { content }
		return rest.post(Routes.channelMessages(channelID), {
			body: message,
		})
	}

	return { text }
}
