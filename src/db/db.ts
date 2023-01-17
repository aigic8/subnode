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

const ROOT_DOMAINS_COL = 'rootDomains'
const SUBDOMAINS_COL = 'subdomains'
const PROJECTS_COL = 'projects'

export function NewDB(URI: string, dbName: string) {
	const client = new MongoClient(URI)
	const db = client.db(dbName)

	// FIXME maybe use a class?
	// FIXME doesnt send back _id when using get methods

	const initialize = async () => {
		await db
			.collection<Project>(PROJECTS_COL)
			.createIndex({ project: 1 }, { unique: true })

		await db.collection<RootDomain>(ROOT_DOMAINS_COL).createIndex({ project: 1 })

		await db
			.collection<Subdomain>(SUBDOMAINS_COL)
			.createIndex({ project: 1, createdAt: 1 })
	}

	const getRootDomains = async (project: string) => {
		const cursor = db.collection<RootDomain>(ROOT_DOMAINS_COL).find({
			project,
		})
		return cursor.toArray()
	}

	const upsertNewRootDomains = async (project: string, rootDomains: string[]) => {
		const domainsColl = db.collection<RootDomain>(ROOT_DOMAINS_COL)
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
		const cursor = db.collection<Subdomain>(SUBDOMAINS_COL).find(filter)
		return cursor.toArray()
	}

	const upsertNewSubdomains = async (
		project: string,
		subdomains: { rootDomain: string; subdomain: string }[]
	) => {
		const subsColl = db.collection<Subdomain>(SUBDOMAINS_COL)
		// FIXME can grow too large! should paginate
		const ops: AnyBulkWriteOperation<Subdomain>[] = subdomains.map(
			({ rootDomain, subdomain }) => {
				return {
					updateOne: {
						upsert: true,
						filter: { project, subdomain },
						update: {
							$setOnInsert: { rootDomain, subdomain, project, createdAt: new Date() },
						},
					},
				}
			}
		)

		const result = await subsColl.bulkWrite(ops)
		if (result.hasWriteErrors()) {
			return result.getWriteErrors()
		}
		return null
	}

	const createProject = async (project: string) => {
		await db
			.collection<Project>(PROJECTS_COL)
			.insertOne({ project, createdAt: new Date(), lastDnsProbed: new Date() })
	}

	const getProject = (project: string) => {
		return db.collection<Project>(PROJECTS_COL).findOne({ project })
	}

	const setProjectLastDnsProbed = async (project: string, lastDnsProbed: Date) => {
		const result = await db
			.collection<Project>(PROJECTS_COL)
			.updateOne({ project }, { $set: { lastDnsProbed } })
		if (result.modifiedCount === 0) throw new Error('project not found')
	}

	const DEBUG_cleanDB = () => {
		return Promise.all([
			db.collection(PROJECTS_COL).deleteMany({}),
			db.collection(SUBDOMAINS_COL).deleteMany({}),
			db.collection(ROOT_DOMAINS_COL).deleteMany({}),
		])
	}

	return {
		initialize,

		getProject,
		createProject,
		setProjectLastDnsProbed,

		getRootDomains,
		upsertNewRootDomains,

		getSubdomains,
		upsertNewSubdomains,

		DEBUG_cleanDB,
	}
}
