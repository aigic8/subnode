import Fastify, { InjectOptions } from 'fastify'
import status from 'http-status'
import { DB } from '../db/db'
import { NotifyInstance } from '../notify'
import ActionController, { ActionControllerConfig } from './controllers/action'
import ProjectController from './controllers/project'
import RootDomainController from './controllers/rootDomain'
import SubdomainController from './controllers/subdomain'
import { INTERNAL_SERVER_MSG } from './utils'

export type ServerApp = ReturnType<typeof App>

export interface ServerOptions {
	db: DB
	authToken: string
	bin: {
		amass: string
		subfinder: string
		findomain: string
		httpx: string
		dnsx: string
	}
	notify: NotifyInstance
	logger?: boolean
}

export function App({ db, bin, notify, logger = true, authToken }: ServerOptions) {
	const app = Fastify({ logger })

	app.setErrorHandler((err, _, reply) => {
		const code = err.statusCode ?? status.INTERNAL_SERVER_ERROR
		const isInternal = code === status.INTERNAL_SERVER_ERROR
		reply
			.code(code)
			.send({ ok: false, error: isInternal ? INTERNAL_SERVER_MSG : err.message })
	})

	app.addHook('onRequest', (req, reply, done) => {
		if (req.method === 'GET') {
			done()
			return
		}
		const contentType = req.headers['content-type']?.split(';')[0].trim()
		if (contentType !== 'application/json')
			reply.code(status.BAD_REQUEST).send({ ok: false, error: 'bad request' })
		done()
	})

	app.addHook('onRequest', (req, reply, done) => {
		const token = req.headers['authentication-token'] // using a none-popular header for security
		if (!token || token !== authToken)
			reply.code(status.UNAUTHORIZED).send({ ok: false, error: 'unauthorized' })
		done()
	})

	app.register(ProjectController(db), { prefix: '/api/projects' })
	app.register(SubdomainController(db), { prefix: '/api/subdomains' })
	app.register(RootDomainController(db), { prefix: '/api/root_domains' })
	app.register(ActionController(db, server2actionControllerBin(bin), notify), {
		prefix: '/api/actions',
	})

	const listen = ({ port, host }: { port: number; host: string }) =>
		app.listen({ port, host })
	const DEBUG_inject = (o: InjectOptions | string) => app.inject(o)

	return { listen, DEBUG_inject }
}

const server2actionControllerBin = (
	bin: ServerOptions['bin']
): ActionControllerConfig => ({
	amassBin: bin.amass,
	findomainBin: bin.findomain,
	subfinderBin: bin.subfinder,
	httpxBin: bin.httpx,
	dnsxBin: bin.dnsx,
})
