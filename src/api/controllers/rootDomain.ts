import { FastifyPluginCallback, RouteShorthandOptions } from 'fastify'
import { DB, RootDomain } from '../../db/db'
import { APIReply, INTERNAL_SERVER_MSG, makeAPIErr } from '../utils'
import status from 'http-status'

const getRootDomainsOptions: RouteShorthandOptions = {
	schema: {
		params: {
			type: 'object',
			properties: {
				project: { type: 'string' },
			},
			required: ['project'],
			additionalProperties: false,
		},
	},
}

type GetRootDomainsShape = {
	Params: { project: string }
	Reply: APIReply<{ rootDomains: RootDomain[] }>
}

const postNewRootDomainsOptions: RouteShorthandOptions = {
	schema: {
		body: {
			type: 'object',
			properties: {
				project: { type: 'string' },
				rootDomains: { type: 'array', items: { type: 'string' } },
			},
			required: ['project', 'rootDomains'],
			additionalProperties: false,
		},
	},
}

type PostNewRootDomainsShape = {
	Body: { project: string; rootDomains: string[] }
	Reply: APIReply<Record<string, never>>
}

export default function RootDomainController(db: DB): FastifyPluginCallback {
	return (app, _, done) => {
		app.get<GetRootDomainsShape>(
			'/:project',
			getRootDomainsOptions,
			async (req, reply) => {
				const { project } = req.params
				try {
					const dbProject = await db.project.get(project)
					if (!dbProject)
						return reply.code(status.NOT_FOUND).send(makeAPIErr('project not found'))
					const rootDomains = await db.rootDomain.get(project)
					return reply.send({ ok: true, data: { rootDomains } })
				} catch (e: any) {
					app.log.error(`error getting root domain: ${e.message}`)
					return reply
						.code(status.INTERNAL_SERVER_ERROR)
						.send(makeAPIErr(INTERNAL_SERVER_MSG))
				}
			}
		)

		app.post<PostNewRootDomainsShape>(
			'/new',
			postNewRootDomainsOptions,
			async (req, reply) => {
				const { project, rootDomains } = req.body

				try {
					const dbProject = await db.project.get(project)
					if (!dbProject)
						return reply.code(status.NOT_FOUND).send(makeAPIErr('project not found'))

					await db.rootDomain.upsert(project, rootDomains)
					return reply.send({ ok: true, data: {} })
				} catch (e: any) {
					app.log.error(`error posting new root domain: ${e.message}`)
					return reply
						.code(status.INTERNAL_SERVER_ERROR)
						.send(makeAPIErr(INTERNAL_SERVER_MSG))
				}
			}
		)

		done()
	}
}
