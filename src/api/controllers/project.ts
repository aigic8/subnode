import { FastifyPluginCallback } from 'fastify'
import { DB, Project } from '../../db/db'
import { APIReply, makeAPIErr } from '../utils'
import status from 'http-status'

type GetProjectShape = {
	Params: { project: string }
	Reply: APIReply<{ project: Project }>
}

type PutNewProjectShape = {
	Body: { project: string }
	Reply: APIReply<{}>
}

export default function ProjectController(db: DB): FastifyPluginCallback {
	return (app, _, done) => {
		app.get<GetProjectShape>('/:project', async (req, reply) => {
			const { project: name } = req.params
			// FIXME custom type for errors
			if (!name || name === '')
				return reply.code(status.BAD_REQUEST).send(makeAPIErr('project is empty'))

			try {
				const project = await db.getProject(name)
				if (!project)
					return reply.code(status.NOT_FOUND).send(makeAPIErr('project not found'))

				const { _id, ...resProject } = project
				return reply.send({ ok: true, data: { project: resProject } })
			} catch (e) {
				// FIXME better error handling
				console.error('ERROR', e)
				reply
					.code(status.INTERNAL_SERVER_ERROR)
					.send(makeAPIErr('internal server error happened!'))
			}
		})

		app.put<PutNewProjectShape>('/new', async (req, reply) => {
			const { project } = req.body
			if (!project || project === '')
				return reply.code(status.BAD_REQUEST).send(makeAPIErr('project name is empty'))

			try {
				await db.createProject(project)
				return reply.send({ ok: true, data: {} })
			} catch (e) {
				console.error('ERROR', e)
				return reply
					.code(status.INTERNAL_SERVER_ERROR)
					.send(makeAPIErr('internal server error happened!'))
			}
		})

		// app.delete("projects")

		done()
	}
}
