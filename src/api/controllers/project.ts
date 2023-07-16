import { FastifyPluginCallback, RouteShorthandOptions } from 'fastify'
import { DB, Project } from '../../db/db'
import { APIReply, INTERNAL_SERVER_MSG, makeAPIErr } from '../utils'
import status from 'http-status'

const getProjectOptions: RouteShorthandOptions = {
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

type GetProjectShape = {
	Params: { project: string }
	Reply: APIReply<{ project: Project }>
}

const postNewProjectOptions: RouteShorthandOptions = {
	schema: {
		body: {
			type: 'object',
			properties: {
				project: { type: 'string' },
			},
			required: ['project'],
			additionalProperties: false,
		},
	},
}

type PostNewProjectShape = {
	Body: { project: string }
	Reply: APIReply<Record<string, never>>
}

export default function ProjectController(db: DB): FastifyPluginCallback {
	return (app, _, done) => {
		app.get<GetProjectShape>('/:project', getProjectOptions, async (req, reply) => {
			const { project: name } = req.params
			try {
				const project = await db.project.get(name)
				if (!project)
					return reply.code(status.NOT_FOUND).send(makeAPIErr('project not found'))

				const { _id, ...resProject } = project // eslint-disable-line
				return reply.send({ ok: true, data: { project: resProject } })
			} catch (e: any) {
				reply.code(status.INTERNAL_SERVER_ERROR).send(makeAPIErr(INTERNAL_SERVER_MSG))
			}
		})

		app.post<PostNewProjectShape>('/new', postNewProjectOptions, async (req, reply) => {
			const { project } = req.body
			try {
				await db.project.add(project)
				return reply.send({ ok: true, data: {} })
			} catch (e: any) {
				app.log.error(`error posting new project: ${e.message}`)
				return reply
					.code(status.INTERNAL_SERVER_ERROR)
					.send(makeAPIErr(INTERNAL_SERVER_MSG))
			}
		})

		// app.delete("projects")

		done()
	}
}
