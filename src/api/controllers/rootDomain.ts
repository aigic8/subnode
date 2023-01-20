import { FastifyPluginCallback } from 'fastify'
import { DB, RootDomain } from '../../db/db'
import { APIReply, makeAPIErr } from '../utils'
import status from 'http-status'

type GetRootDomainsShape = {
	Params: { project: string }
	Reply: APIReply<{ rootDomains: RootDomain[] }>
}

type PutNewRootDomainsShape = {
	Body: { project: string; rootDomains: string[] }
	Reply: APIReply<{}>
}

export default function RootDomainController(db: DB): FastifyPluginCallback {
	return (app, _, done) => {
		app.get<GetRootDomainsShape>('/:project', async (req, reply) => {
			const { project } = req.params

			if (!project || project === '')
				return reply.code(status.BAD_REQUEST).send(makeAPIErr('project is empty'))

			try {
				const dbProject = await db.getProject(project)
				if (!dbProject)
					return reply.code(status.NOT_FOUND).send(makeAPIErr('project not found'))
				const rootDomains = await db.getRootDomains(project)
				return reply.send({ ok: true, data: { rootDomains } })
			} catch (e) {
				console.error(e)
				return reply
					.code(status.INTERNAL_SERVER_ERROR)
					.send(makeAPIErr('internal server error happened!'))
			}
		})

		app.put<PutNewRootDomainsShape>('/new', async (req, reply) => {
			const { project, rootDomains } = req.body

			if (!project || project === '')
				return reply.code(status.BAD_REQUEST).send(makeAPIErr('project is empty'))

			if (!rootDomains || rootDomains.length === 0)
				return reply.code(status.BAD_REQUEST).send(makeAPIErr('rootDomains is empty'))

			try {
				const dbProject = await db.getProject(project)
				if (!dbProject)
					return reply.code(status.NOT_FOUND).send(makeAPIErr('project not found'))

				await db.upsertNewRootDomains(project, rootDomains)
				return reply.send({ ok: true, data: {} })
			} catch (e) {
				console.error(e)
				return reply
					.code(status.INTERNAL_SERVER_ERROR)
					.send(makeAPIErr('internal server error happened!'))
			}
		})

		done()
	}
}
