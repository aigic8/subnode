import { FastifyPluginCallback, RouteShorthandOptions } from 'fastify'
import { DB, Subdomain } from '../../db/db'
import { APIReply, dnsProbe, enumSubs, httpProbe, makeAPIErr } from '../utils'
import status from 'http-status'
import { NotifyInstance } from '../../notify'

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

export interface ActionControllerConfig {
	amassBin: string
	subfinderBin: string
	findomainBin: string
	httpxBin: string
	dnsxBin: string
}

export default function ActionController(
	db: DB,
	config: ActionControllerConfig,
	notify: NotifyInstance
): FastifyPluginCallback {
	// FIXME check if we are not already doing the operation asked (better to be in DB, for multithreading)
	// TODO find a safe way to test action controller
	// TODO IMPORTANT create an event handler + queue for actions, then test them
	return (app, _, done) => {
		app.post<CheckNewSubsShape>(
			'/check_new_subs',
			checkNewSubsOptions,
			async (req, reply) => {
				const { project: projectName } = req.body
				if (!projectName || projectName === '')
					return reply.code(status.BAD_REQUEST).send(makeAPIErr('project is empty'))

				const project = await db.project.get(projectName)
				if (!project)
					return reply.code(status.NOT_FOUND).send(makeAPIErr('project does not exist'))

					// we DO NOT await this intensionally, we don't want the API user to wait for this
				;(async () => {
					// FIXME api to pass only new subs to next stages
					try {
						await notifyNewSubdomains(projectName)
						await notifyNewSubdomainsWithIP(projectName)
						await notifyNewSubdomainsWithHTTP(projectName)
					} catch (e: any) {
						app.log.error(`error notifiying user: ${e.message}`)
					}
				})()

				return reply.send({ ok: true, data: {} })
			}
		)

		app.post<DnsProbeShape>('/dns_probe', dnsProbeOptions, async (req, reply) => {
			const { project: projectName } = req.body
			if (!projectName || projectName === '')
				return reply.code(status.BAD_REQUEST).send(makeAPIErr('project is empty'))

			const project = await db.project.get(projectName)
			if (!project)
				return reply.code(status.NOT_FOUND).send(makeAPIErr('project does not exist'))

				// we DO NOT await this intensionally, we don't want the API user to wait for this
			;(async () => {
				try {
					await notifyNewSubdomainsWithIP(projectName)
				} catch (e: any) {
					app.log.error(`error notifiying user: ${e.message}`)
				}
			})()

			return reply.send({ ok: true, data: {} })
		})

		app.post<HttpProbeShape>('/http_probe', httpProbeOptions, async (req, reply) => {
			const { project: projectName } = req.body
			if (!projectName || projectName === '')
				return reply.code(status.BAD_REQUEST).send(makeAPIErr('project is empty'))

			const project = await db.project.get(projectName)
			if (!project)
				return reply.code(status.NOT_FOUND).send(makeAPIErr('project does not exist'))

				// we DO NOT await this intensionally, we don't want the API user to wait for this
			;(async () => {
				try {
					await notifyNewSubdomainsWithHTTP(projectName)
				} catch (e: any) {
					app.log.error(`error notifiying user: ${e.message}`)
				}
			})()

			return reply.send({ ok: true, data: {} })
		})

		/**  Fetch new subdomains and notify user about them.
		 * If optional parameter `rootDomains` is not provided it will be fetched from db */
		async function notifyNewSubdomains(project: string, rootDomains?: string[]) {
			let roots: string[]
			if (rootDomains) roots = rootDomains
			else roots = (await db.rootDomain.get(project)).map(item => item.rootDomain)

			const startTime = new Date()
			const enumEvs = enumSubs(roots, {
				amassBin: config.amassBin,
				findomainBin: config.findomainBin,
				subfinderBin: config.subfinderBin,
			})

			enumEvs.on('error', err =>
				app.log.error(`error enumerating subdomains: ${err.message}`)
			)

			const subs: { subdomain: string; rootDomain: string }[] = []
			enumEvs.on('sub', subdomain => {
				const rootDomain = roots.find(root => subdomain.endsWith(root))
				if (!rootDomain) app.log.error(`couldnt find root domain for sub: ${subdomain}`)
				else subs.push({ subdomain, rootDomain })
			})

			enumEvs.on('done', async () => {
				const subsUpsertErrs = await db.subdomain.upsert(project, subs)
				if (subsUpsertErrs && subsUpsertErrs.length > 0)
					subsUpsertErrs.forEach(err =>
						app.log.error(`write error upserting subdomains: ${err.errmsg}`)
					)

				const newSubs = await db.subdomain.get(project, startTime)
				if (newSubs.length > 0) notify.text(newSubsNotifyText(project, newSubs))
			})
		}

		/** DNS probes subdomains and notifies user about the new ones with ip.
		 * If optional paramter `subdomains` is not provided, it will be fetched from db.
		 */
		async function notifyNewSubdomainsWithIP(project: string, subdomains?: string[]) {
			const startTime = new Date()
			let subs: string[] = []
			if (subdomains) subs = [...subdomains]
			else subs = (await db.subdomain.get(project)).map(item => item.subdomain)

			let subsMap: { [key: string]: boolean }
			subs.forEach(sub => (subsMap[sub] = true))

			const probeEvs = dnsProbe(config.dnsxBin, subs)
			probeEvs.on('sub', sub => (subsMap[sub] = true))
			probeEvs.on('error', err => app.log.error(`error dns probing: ${err.message}`))

			probeEvs.on('done', async () => {
				await db.subdomain.ensureDNSState(project, subsMap)
				const newSubsWithIp = await db.subdomain.getWithIp(project, startTime)
				if (newSubsWithIp.length > 0)
					notify.text(newHttpSubsNotifyText(project, newSubsWithIp))
			})
		}

		/** HTTP probes subdomains and notifes user about the new ones with HTTP.
		 * If optional parameter `subdomains` is not provided, **subdomains with IP** will be fetched from db
		 */
		async function notifyNewSubdomainsWithHTTP(project: string, subdomains?: string[]) {
			const startTime = new Date()
			let subs: string[] = []
			if (subdomains) subs = [...subdomains]
			else subs = (await db.subdomain.getWithIp(project)).map(item => item.subdomain)

			const subsMap: { [key: string]: boolean } = {}
			subs.forEach(sub => (subsMap[sub] = false))

			const probeEvs = httpProbe(config.httpxBin, subs)
			probeEvs.on('sub', sub => (subsMap[sub] = true))
			probeEvs.on('error', err => app.log.error(`error http probing: ${err.message}`))

			probeEvs.on('done', async () => {
				// TODO error handling for done event!
				await db.subdomain.ensureHTTPState(project, subsMap)
				const newSubsWithHTTP = await db.subdomain.getWithHTTP(project, startTime)
				if (newSubsWithHTTP.length > 0)
					notify.text(newDnsSubsNotifyText(project, newSubsWithHTTP))
			})
		}

		done()
	}
}

function newSubsNotifyText(project: string, newSubs: Subdomain[]) {
	let text = `Found **${newSubs.length}** passive subdomains for project **${project}**`
	if (newSubs.length > 60)
		text += newSubs
			.slice(0, 60)
			.map(sub => sub.subdomain)
			.join('\n')
	else text += newSubs.join('\n')
	return text
}

function newDnsSubsNotifyText(project: string, newSubs: Subdomain[]) {
	let text = `Found **${newSubs.length}** subdomains with ip for project **${project}**`
	if (newSubs.length > 60)
		text += newSubs
			.slice(0, 60)
			.map(sub => sub.subdomain)
			.join('\n')
	else text += newSubs.join('\n')
	return text
}

function newHttpSubsNotifyText(project: string, newSubs: Subdomain[]) {
	let text = `Found **${newSubs.length}** http subdomains for project **${project}**`
	if (newSubs.length > 60)
		text += newSubs
			.slice(0, 60)
			.map(sub => sub.subdomain)
			.join('\n')
	else text += newSubs.join('\n')
	return text
}
