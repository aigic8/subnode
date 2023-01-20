import { FastifyPluginCallback } from 'fastify'
import { DB, Subdomain } from '../../db/db'
import status from 'http-status'
import { APIReply, makeAPIErr } from '../utils'

type GetSubdomainsShape = {
	Params: { project: string }
	Querystring: { after?: string }
	Reply: APIReply<{ subdomains: Subdomain[] }>
}

export default function SubdomainController(db: DB): FastifyPluginCallback {
	return (app, _, done) => {
		app.get<GetSubdomainsShape>('/:project', async (req, reply) => {
			const { project } = req.params
			const { after } = req.query

			if (!project || project === '')
				return reply.code(status.BAD_REQUEST).send(makeAPIErr('project is empty'))

			try {
				const dbProject = await db.getProject(project)
				if (!dbProject)
					return reply.code(status.NOT_FOUND).send(makeAPIErr('project not found'))
			} catch (e) {
				console.error(e)
				return reply
					.code(status.INTERNAL_SERVER_ERROR)
					.send(makeAPIErr('internal server error happened!'))
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
					.send(makeAPIErr('internal server error happened!'))
			}
		})

		done()
	}
}
