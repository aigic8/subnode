import Fastify, { InjectOptions } from 'fastify'
import { DB } from '../db/db'
import ActionController from './controllers/action'
import ProjectController from './controllers/project'
import RootDomainController from './controllers/rootDomain'
import SubdomainController from './controllers/subdomain'

export type ServerApp = ReturnType<typeof App>

interface ServerOptions {
	db: DB
	logger?: boolean
}

export function App({ db, logger = true }: ServerOptions) {
	const app = Fastify({ logger })

	app.register(ProjectController(db), { prefix: '/api/projects' })
	app.register(SubdomainController(db), { prefix: '/api/subdomains' })
	app.register(RootDomainController(db), { prefix: '/api/root_domains' })
	app.register(ActionController(db), { prefix: '/api/actions' })

	const listen = ({ port, host }: { port: number; host: string }) =>
		app.listen({ port, host })
	const DEBUG_inject = (o: InjectOptions | string) => app.inject(o)

	return { listen, DEBUG_inject }
}
