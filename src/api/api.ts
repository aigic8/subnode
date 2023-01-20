import Fastify, { InjectOptions } from 'fastify'
import { DB, Project, RootDomain, Subdomain } from '../db/db'
import status from 'http-status'

export type APIReply<T> = { ok: true; data: T } | { ok: false; error: string }
export type ServerApp = ReturnType<typeof App>

interface ServerOptions {
	db: DB
	logger?: boolean
}

type GetProjectShape = {
	Params: { project: string }
	Reply: APIReply<{ project: Project }>
}

type PutNewProjectShape = {
	Body: { project: string }
	Reply: APIReply<{}>
}

type GetSubdomainsShape = {
	Params: { project: string }
	Querystring: { after?: string }
	Reply: APIReply<{ subdomains: Subdomain[] }>
}

type GetRootDomainsShape = {
	Params: { project: string }
	Reply: APIReply<{ rootDomains: RootDomain[] }>
}

type PutNewRootDomainsShape = {
	Body: { project: string; rootDomains: string[] }
	Reply: APIReply<{}>
}

const makeErr = (error: string) => ({ ok: false, error } as { ok: false; error: string })

export function App({ db, logger = true }: ServerOptions) {
	const app = Fastify({ logger })

	// FIXME add versioning and api prefix
	// FIXME each part in a seperate file

	app.get<GetProjectShape>('/projects/:project', async (req, reply) => {
		const { project: name } = req.params
		// FIXME custom type for errors
		if (!name || name === '')
			return reply.code(status.BAD_REQUEST).send(makeErr('project is empty'))

		try {
			const project = await db.getProject(name)
			if (!project) return reply.code(status.NOT_FOUND).send(makeErr('project not found'))

			const { _id, ...resProject } = project
			return reply.send({ ok: true, data: { project: resProject } })
		} catch (e) {
			// FIXME better error handling
			console.error('ERROR', e)
			reply
				.code(status.INTERNAL_SERVER_ERROR)
				.send(makeErr('internal server error happened!'))
		}
	})

	app.put<PutNewProjectShape>('/projects/new', async (req, reply) => {
		const { project } = req.body
		if (!project || project === '')
			return reply.code(status.BAD_REQUEST).send(makeErr('project name is empty'))

		try {
			await db.createProject(project)
			return reply.send({ ok: true, data: {} })
		} catch (e) {
			console.error('ERROR', e)
			return reply
				.code(status.INTERNAL_SERVER_ERROR)
				.send(makeErr('internal server error happened!'))
		}
	})

	// app.delete("projects")

	app.get<GetSubdomainsShape>('/subdomains/:project', async (req, reply) => {
		const { project } = req.params
		const { after } = req.query

		if (!project || project === '')
			return reply.code(status.BAD_REQUEST).send(makeErr('project is empty'))

		try {
			const dbProject = await db.getProject(project)
			if (!dbProject)
				return reply.code(status.NOT_FOUND).send(makeErr('project not found'))
		} catch (e) {
			console.error(e)
			return reply
				.code(status.INTERNAL_SERVER_ERROR)
				.send(makeErr('internal server error happened!'))
		}

		// FIXME validation the after string is a date
		const afterDate = after ? new Date(after) : undefined
		try {
			const subdomains = await db.getSubdomains(project, afterDate)
			return reply.send({ ok: true, data: { subdomains } })
		} catch (e) {
			console.error(e)
			return reply
				.code(status.INTERNAL_SERVER_ERROR)
				.send(makeErr('internal server error happened!'))
		}
	})

	app.get<GetRootDomainsShape>('/root_domains/:project', async (req, reply) => {
		const { project } = req.params

		if (!project || project === '')
			return reply.code(status.BAD_REQUEST).send(makeErr('project is empty'))

		try {
			const dbProject = await db.getProject(project)
			if (!dbProject)
				return reply.code(status.NOT_FOUND).send(makeErr('project not found'))
			const rootDomains = await db.getRootDomains(project)
			return reply.send({ ok: true, data: { rootDomains } })
		} catch (e) {
			console.error(e)
			return reply
				.code(status.INTERNAL_SERVER_ERROR)
				.send(makeErr('internal server error happened!'))
		}
	})

	app.put<PutNewRootDomainsShape>('/root_domains/new', async (req, reply) => {
		const { project, rootDomains } = req.body

		if (!project || project === '')
			return reply.code(status.BAD_REQUEST).send(makeErr('project is empty'))

		if (!rootDomains || rootDomains.length === 0)
			return reply.code(status.BAD_REQUEST).send(makeErr('rootDomains is empty'))

		try {
			const dbProject = await db.getProject(project)
			if (!dbProject)
				return reply.code(status.NOT_FOUND).send(makeErr('project not found'))

			await db.upsertNewRootDomains(project, rootDomains)
			return reply.send({ ok: true, data: {} })
		} catch (e) {
			console.error(e)
			return reply
				.code(status.INTERNAL_SERVER_ERROR)
				.send(makeErr('internal server error happened!'))
		}
	})

	// app.post("actions/check_new_subs")
	// app.post("actions/dns_probe")
	// app.post("actions/http_probe")

	const listen = ({ port, host }: { port: number; host: string }) =>
		app.listen({ port, host })
	const DEBUG_inject = (o: InjectOptions | string) => app.inject(o)

	return { listen, DEBUG_inject }
}
