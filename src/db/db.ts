import { AnyBulkWriteOperation, MongoClient } from 'mongodb'

interface Subdomain {
	subdomain: string
	rootDomain: string
	createdAt: Date
}

interface Project {
	project: string
	lastDnsProbed: Date
	createdAt: Date
}

export function NewDB(URI: string, dbName: string) {
	const client = new MongoClient(URI)
	const db = client.db(dbName)

	const getSubsCreatedAfter = async (date: Date) => {
		const cursor = db.collection<Subdomain>('subdomains').find({
			createdAt: { $gte: date },
		})
		return cursor.toArray()
	}

	const upsertNewSubdomains = async (domain: string, subdomains: string[]) => {
		const subsColl = db.collection<Subdomain>('subdomains')
		// FIXME can grow too large! should paginate
		const ops: AnyBulkWriteOperation<Subdomain>[] = subdomains.map(subdomain => ({
			updateOne: {
				upsert: true,
				filter: { subdomain },
				update: {
					$setOnInsert: { rootDomain: domain, subdomain, createdAt: new Date() },
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

		getSubsCreatedAfter,
		upsertNewSubdomains,
	}
}
