import { AnyBulkWriteOperation, Filter, MongoClient } from 'mongodb'

export interface Subdomain {
	subdomain: string
	rootDomain: string
	project: string
	createdAt: Date
}

export interface Project {
	project: string
	lastDnsProbed: Date
	createdAt: Date
}

export interface RootDomain {
	rootDomain: string
	project: string
	createdAt: Date
}

export type DB = ReturnType<typeof NewDB>

export function NewDB(URI: string, dbName: string) {
	const client = new MongoClient(URI)
	const db = client.db(dbName)

	// FIXME maybe use a class?
	// FIXME doesnt send back _id when using get methods

	const getRootDomains = async (project: string) => {
		const cursor = db.collection<RootDomain>('rootDomains').find({
			project,
		})
		return cursor.toArray()
	}

	const upsertNewRootDomains = async (project: string, rootDomains: string[]) => {
		const domainsColl = db.collection<RootDomain>('rootDomains')
		// FIXME can grow too large! should paginate
		const ops: AnyBulkWriteOperation<RootDomain>[] = rootDomains.map(rootDomain => ({
			updateOne: {
				upsert: true,
				filter: { project, rootDomain },
				update: {
					$setOnInsert: { project, rootDomain, createdAt: new Date() },
				},
			},
		}))

		const result = await domainsColl.bulkWrite(ops)
		if (result.hasWriteErrors()) {
			return result.getWriteErrors()
		}
		return null
	}

	const getSubdomains = async (project: string, after?: Date) => {
		let filter: Filter<Subdomain> = { project }
		if (after) filter = { ...filter, createdAt: { $gte: after } }
		// TODO paginate subdomains, they can be a lot of them
		const cursor = db.collection<Subdomain>('subdomains').find(filter)
		return cursor.toArray()
	}

	const upsertNewSubdomains = async (
		project: string,
		domain: string,
		subdomains: string[]
	) => {
		const subsColl = db.collection<Subdomain>('subdomains')
		// FIXME can grow too large! should paginate
		const ops: AnyBulkWriteOperation<Subdomain>[] = subdomains.map(subdomain => ({
			updateOne: {
				upsert: true,
				filter: { project, subdomain },
				update: {
					$setOnInsert: { rootDomain: domain, subdomain, project, createdAt: new Date() },
				},
			},
		}))

		const result = await subsColl.bulkWrite(ops)
		if (result.hasWriteErrors()) {
			return result.getWriteErrors()
		}
		return null
	}

	const createProject = async (project: string) => {
		await db
			.collection<Project>('projects')
			.insertOne({ project, createdAt: new Date(), lastDnsProbed: new Date() })
	}

	const getProject = (project: string) => {
		return db.collection<Project>('projects').findOne({ project })
	}

	const setProjectLastDnsProbed = async (project: string, lastDnsProbed: Date) => {
		db.collection<Project>('projects').updateOne({ project }, { lastDnsProbed })
	}

	return {
		getProject,
		createProject,
		setProjectLastDnsProbed,

		getRootDomains,
		upsertNewRootDomains,

		getSubdomains,
		upsertNewSubdomains,
	}
}
