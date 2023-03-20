import { AnyBulkWriteOperation, Db, Filter } from 'mongodb'

export interface Subdomain {
	subdomain: string
	rootDomain: string
	project: string
	hadIPFrom: Date | null
	hadHTTPFrom: Date | null
	createdAt: Date
}

export default function SubdomainModel(db: Db, collName = 'subdomains') {
	const coll = db.collection<Subdomain>(collName)

	const init = async () => {
		await coll.createIndex({ project: 1, createdAt: 1 })
	}

	const get = (project: string, after?: Date) => {
		let filter: Filter<Subdomain> = { project }
		if (after) filter = { ...filter, createdAt: { $gte: after } }
		// TODO paginate subdomains, they can be a lot of them
		return coll.find(filter).toArray()
	}

	const getWithIp = (project: string, after?: Date) => {
		let filter: Filter<Subdomain> = { project }
		if (after) filter = { ...filter, hadIPFrom: { $gte: after } }
		else filter = { ...filter, hadIPFrom: { $ne: null } }
		return coll.find(filter).toArray()
	}

	const getWithHTTP = (project: string, after?: Date) => {
		let filter: Filter<Subdomain> = { project }
		if (after) filter = { ...filter, hadHTTPFrom: { $gte: after } }
		else filter = { ...filter, hadHTTPFrom: { $ne: null } }
		return coll.find(filter).toArray()
	}

	const upsert = async (
		project: string,
		subdomains: { rootDomain: string; subdomain: string }[]
	) => {
		// FIXME can grow too large! should paginate, api should be changed to something like event emitter
		const ops: AnyBulkWriteOperation<Subdomain>[] = subdomains.map(
			({ rootDomain, subdomain }) => {
				return {
					updateOne: {
						upsert: true,
						filter: { project, subdomain },
						update: {
							$setOnInsert: {
								rootDomain,
								subdomain,
								project,
								hadIPFrom: null,
								hadHTTPFrom: null,
								createdAt: new Date(),
							},
						},
					},
				}
			}
		)

		const result = await coll.bulkWrite(ops)
		if (result.hasWriteErrors()) {
			return result.getWriteErrors()
		}
		return null
	}

	/** If subdomain DOES HAVE an ip, then it will check if
	 * if hadIPFrom currently is null, if it is, then it will be
	 * set to date.
	 * If subdomain DOES NOT HAVE an ip, the it will check
	 * if currently hadIPFrom is not null, and set it to null */
	const ensureDNSState = async (
		project: string,
		subdomains: { [key: string]: boolean }
	) => {
		const ops: AnyBulkWriteOperation<Subdomain>[] = Object.keys(subdomains).map(
			subdomain => ({
				updateOne: {
					filter: {
						project,
						subdomain,
						hadIPFrom: subdomains[subdomain] ? null : { $not: { $eq: null } },
					},
					update: {
						$set: {
							hadIPFrom: subdomains[subdomain] ? new Date() : null,
						},
					},
				},
			})
		)

		const result = await coll.bulkWrite(ops)
		if (result.hasWriteErrors()) return result.getWriteErrors()
		return null
	}

	/**  If subdomain DOES HAVE http, then it will check if
	 * if hadHTTPFrom currently is null, if it is, then it will be
	 * set to date.
	 * If subdomain DOES NOT HAVE http, the it will check
	 * if currently hadHTTPFrom is not null, and set it to null */
	const ensureHTTPState = async (
		project: string,
		subdomains: { [key: string]: boolean }
	) => {
		const ops: AnyBulkWriteOperation<Subdomain>[] = Object.keys(subdomains).map(
			subdomain => ({
				updateOne: {
					filter: {
						project,
						subdomain,
						hadHTTPFrom: subdomains[subdomain] ? null : { $not: { $eq: null } },
					},
					update: {
						$set: {
							hadHTTPFrom: subdomains[subdomain] ? new Date() : null,
						},
					},
				},
			})
		)

		const result = await coll.bulkWrite(ops)
		if (result.hasWriteErrors()) return result.getWriteErrors()
		return null
	}

	return { init, get, getWithIp, getWithHTTP, upsert, ensureDNSState, ensureHTTPState }
}
