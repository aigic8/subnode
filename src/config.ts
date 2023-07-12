import Ajv from 'ajv'
import { readFile } from 'fs/promises'

const dbSchema = {
	type: 'object',
	properties: {
		url: { type: 'string' },
		name: { type: 'string' },
	},
	required: ['url', 'name'],
	additionalProperties: false,
}

const binSchema = {
	type: 'object',
	properties: {
		amass: { type: 'string' },
		findomain: { type: 'string' },
		subfinder: { type: 'string' },
		httpx: { type: 'string' },
		dnsx: { type: 'string' },
	},
	required: ['amass', 'findomain', 'subfinder', 'httpx', 'dnsx'],
	additionalProperties: false,
}

const notifySchema = {
	type: 'object',
	properties: {
		token: { type: 'string' },
		channelID: { type: 'string' },
	},
	required: ['token', 'channelID'],
	additionalProperties: false,
}

const configSchema = {
	type: 'object',
	properties: {
		host: { type: 'string' },
		port: { type: 'number' },
		authToken: { type: 'string' },
		logger: { type: 'boolean' },
		db: dbSchema,
		bin: binSchema,
		notify: notifySchema,
	},
	required: ['host', 'port', 'db', 'bin', 'authToken', 'notify'],
	additionalProperties: false,
}

export interface Configuration {
	host: string
	port: number
	authToken: string
	logger?: boolean
	db: {
		url: string
		name: string
	}
	bin: {
		amass: string
		findomain: string
		subfinder: string
		httpx: string
		dnsx: string
	}
	notify: {
		token: string
		channelID: string
	}
}

const ajv = new Ajv()
const validate = ajv.compile(configSchema)

export async function loadConfig(configPath: string) {
	const configStr = await readFile(configPath, 'utf8')
	const config = JSON.parse(configStr)
	const isValid = validate(config)
	if (!isValid && validate.errors) {
		const errorsStr = validate.errors.reduce(
			(prev, err) => (err.message ? prev + err.message : prev),
			''
		)
		throw new Error(`config validation errors: ${errorsStr}`)
	}
	return config as Configuration
}
