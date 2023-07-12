import { program } from 'commander'
import { App } from './api/api'
import { loadConfig } from './config'
import { NewDB } from './db/db'
import path from 'path'
import Notify from './notify'

const DEFAULT_CONFIG_PATH = 'subnode.json'

interface CLIOptions {
	config: string
}

async function main() {
	program
		.option(
			'-c, --config <path>',
			'configuration file path, default is subnode.json',
			DEFAULT_CONFIG_PATH
		)
		.parse()

	const configPathRaw = program.opts<CLIOptions>().config
	// If the provided path starts with "/" , it is an absolute path, so cwd should not be joined.
	const configPath = configPathRaw.startsWith('/')
		? configPathRaw
		: path.join(process.cwd(), configPathRaw)
	const c = await loadConfig(configPath)

	const db = NewDB(c.db.url, c.db.name)
	await db.initialize()
	const { bin, authToken, logger = false } = c
	const notify = Notify(c.notify)
	const app = App({ db, bin, notify, logger, authToken })
	app.listen({ host: c.host, port: c.port })
}

main()
