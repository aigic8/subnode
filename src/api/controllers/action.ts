import { FastifyPluginCallback, RouteShorthandOptions } from 'fastify'
import { DB } from '../../db/db'
import { APIReply, dnsProbe, enumSubs, httpProbe, makeAPIErr } from '../utils'
import status from 'http-status'

const checkNewSubsOptions: RouteShorthandOptions = {
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

interface CheckNewSubsShape {
	Body: { project: string }
	Reply: APIReply<Record<string, never>>
}

const dnsProbeOptions: RouteShorthandOptions = {
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

interface DnsProbeShape {
	Body: { project: string }
	Reply: APIReply<Record<string, never>>
}

const httpProbeOptions: RouteShorthandOptions = {
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

interface HttpProbeShape {
	Body: { project: string }
	Reply: APIReply<Record<string, never>>
}

export default function ActionController(db: DB): FastifyPluginCallback {
	// FIXME check if we are not already doing the operation asked (better to be in DB, for multithreading)
	// TODO find a safe way to test action controller
	return (app, _, done) => {
		app.post<CheckNewSubsShape>(
			'/check_new_subs',
			checkNewSubsOptions,
			async (req, reply) => {
				const { project: projectName } = req.body
				if (!projectName || projectName === '')
					return reply.code(status.BAD_REQUEST).send(makeAPIErr('project is empty'))

				const project = await db.getProject(projectName)
				if (!project)
					return reply.code(status.NOT_FOUND).send(makeAPIErr('project does not exist'))

					// we DO NOT await this intensionally, we don't want the API user to wait for this
				;(async () => {
					// FIXME api to pass only new subs to next stages
					try {
						await notifyNewSubdomains(projectName)
						await notifyNewSubdomainsWithIP(projectName)
						await notifyNewSubdomainsWithHTTP(projectName)
					} catch (e) {
						console.error(e) // FIXME logging
					}
				})()

				return reply.send({ ok: true, data: {} })
			}
		)

		app.post<DnsProbeShape>('/dns_probe', dnsProbeOptions, async (req, reply) => {
			const { project: projectName } = req.body
			if (!projectName || projectName === '')
				return reply.code(status.BAD_REQUEST).send(makeAPIErr('project is empty'))

			const project = await db.getProject(projectName)
			if (!project)
				return reply.code(status.NOT_FOUND).send(makeAPIErr('project does not exist'))

				// we DO NOT await this intensionally, we don't want the API user to wait for this
			;(async () => {
				try {
					await notifyNewSubdomainsWithIP(projectName)
				} catch (e) {
					console.error(e) // FIXME logging
				}
			})()

			return reply.send({ ok: true, data: {} })
		})

		app.post<HttpProbeShape>('/http_probe', httpProbeOptions, async (req, reply) => {
			const { project: projectName } = req.body
			if (!projectName || projectName === '')
				return reply.code(status.BAD_REQUEST).send(makeAPIErr('project is empty'))

			const project = await db.getProject(projectName)
			if (!project)
				return reply.code(status.NOT_FOUND).send(makeAPIErr('project does not exist'))

				// we DO NOT await this intensionally, we don't want the API user to wait for this
			;(async () => {
				try {
					await notifyNewSubdomainsWithHTTP(projectName)
				} catch (e) {
					console.error(e) // FIXME logging
				}
			})()

			return reply.send({ ok: true, data: {} })
		})

		/**  Fetch new subdomains and notify user about them.
		 * If optional parameter `rootDomains` is not provided it will be fetched from db */
		async function notifyNewSubdomains(project: string, rootDomains?: string[]) {
			let roots: string[]
			if (rootDomains) roots = rootDomains
			else roots = (await db.getRootDomains(project)).map(item => item.rootDomain)

			const startTime = new Date()
			// FIXME use config file
			const enumEvs = enumSubs(roots, {
				amassBin: 'bin/amass',
				findomainBin: 'bin/findomain',
				subfinderBin: 'bin/subfinder',
			})

			enumEvs.on('error', console.error) // FIXME logging

			const subs: { subdomain: string; rootDomain: string }[] = []
			enumEvs.on('sub', subdomain => {
				const rootDomain = roots.find(root => subdomain.endsWith(root))
				if (!rootDomain)
					console.error('couldnt find root domain for sub: ', subdomain) // FIXME logging
				else subs.push({ subdomain, rootDomain })
			})

			// FIXME also want subdomains that became alive or found ip
			enumEvs.on('done', async () => {
				const subsUpsertErrs = await db.upsertNewSubdomains(project, subs)
				if (subsUpsertErrs && subsUpsertErrs.length > 0)
					subsUpsertErrs.forEach(err =>
						console.error("couldn't upsert subdomains: ", err)
					) // FIXME logging

				const newSubs = await db.getSubdomains(project, startTime)
				if (newSubs.length > 0) console.log('NEW SUBS FOUND')
				// FIXME notify the user about the new subs
			})
		}

		/** DNS probes subdomains and notifies user about the new ones with ip.
		 * If optional paramter `subdomains` is not provided, it will be fetched from db.
		 */
		async function notifyNewSubdomainsWithIP(project: string, subdomains?: string[]) {
			const startTime = new Date()
			let subs: string[] = []
			if (subdomains) subs = [...subdomains]
			else subs = (await db.getSubdomains(project)).map(item => item.subdomain)

			let subsMap: { [key: string]: boolean }
			subs.forEach(sub => (subsMap[sub] = true))

			// FIXME load from config
			const probeEvs = dnsProbe('bin/dnsx', subs)
			probeEvs.on('sub', sub => (subsMap[sub] = true))
			probeEvs.on('error', console.error) // FIXME logging

			probeEvs.on('done', async () => {
				await db.ensureSubdomainsDNSState(project, subsMap)
				const newSubsWithIp = await db.getSubdomainsWithIp(project, startTime)
				if (newSubsWithIp.length > 0) console.log('FOUND NEW SUBS WITH IP!')
			})
		}

		/** HTTP probes subdomains and notifes user about the new ones with HTTP.
		 * If optional parameter `subdomains` is not provided, **subdomains with IP** will be fetched from db
		 */
		async function notifyNewSubdomainsWithHTTP(project: string, subdomains?: string[]) {
			const startTime = new Date()
			let subs: string[] = []
			if (subdomains) subs = [...subdomains]
			else subs = (await db.getSubdomainsWithIp(project)).map(item => item.subdomain)

			const subsMap: { [key: string]: boolean } = {}
			subs.forEach(sub => (subsMap[sub] = false))

			const probeEvs = httpProbe('bin/httpx', subs)
			probeEvs.on('sub', sub => (subsMap[sub] = true))
			probeEvs.on('error', console.error) // FIXME logging

			probeEvs.on('done', async () => {
				await db.ensureSubdomainsHTTPState(project, subsMap)
				const newSubsWithHTTP = await db.getSubdomainsWithHTTP(project, startTime)
				if (newSubsWithHTTP.length > 0) console.log('FOUND NEW SUBS WITH HTTP!')
			})
		}

		done()
	}
}
