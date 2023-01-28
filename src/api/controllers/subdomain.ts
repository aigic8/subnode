import { FastifyPluginCallback, RouteShorthandOptions } from 'fastify'
import { DB, Subdomain } from '../../db/db'
import status from 'http-status'
import { APIReply, INTERNAL_SERVER_MSG, makeAPIErr } from '../utils'

const getSubdomainsOptions: RouteShorthandOptions = {
	schema: {
		params: {
			type: 'object',
			properties: {
				project: { type: 'string' },
			},
			required: ['project'],
			additionalProperties: false,
		},
		querystring: {
			type: 'object',
			properties: {
				after: { type: 'string', format: 'date-time' },
				removeAdditional: true,
			},
		},
	},
}

type GetSubdomainsShape = {
	Params: { project: string }
	Querystring: { after?: string }
	Reply: APIReply<{ subdomains: Subdomain[] }>
}

export default function SubdomainController(db: DB): FastifyPluginCallback {
	return (app, _, done) => {
		app.get<GetSubdomainsShape>('/:project', getSubdomainsOptions, async (req, reply) => {
			const { project } = req.params
			const { after } = req.query

			try {
				const dbProject = await db.getProject(project)
				if (!dbProject)
					return reply.code(status.NOT_FOUND).send(makeAPIErr('project not found'))
			} catch (e: any) {
				app.log.error(`error getting project: ${e.message}`)
				return reply
					.code(status.INTERNAL_SERVER_ERROR)
					.send(makeAPIErr(INTERNAL_SERVER_MSG))
			}

			const afterDate = after ? new Date(after) : undefined
			try {
				const subdomains = await db.getSubdomains(project, afterDate)
				return reply.send({ ok: true, data: { subdomains } })
			} catch (e: any) {
				app.log.error(`error getting subdomain: ${e.message}`)
				return reply
					.code(status.INTERNAL_SERVER_ERROR)
					.send(makeAPIErr(INTERNAL_SERVER_MSG))
			}
		})

		done()
	}
}
