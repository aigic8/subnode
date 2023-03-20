import { AnyBulkWriteOperation, Db } from 'mongodb'

export interface RootDomain {
	rootDomain: string
	project: string
	createdAt: Date
}

export default function RootDomainModel(db: Db, collName = 'rootDomains') {
	const coll = db.collection<RootDomain>(collName)

	const init = async () => {
		await coll.createIndex({ project: 1 })
	}

	const get = (project: string) => {
		const cursor = coll.find({ project })
		return cursor.toArray()
	}

	const upsert = async (project: string, rootDomains: string[]) => {
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

		const result = await coll.bulkWrite(ops)
		if (result.hasWriteErrors()) {
			return result.getWriteErrors()
		}
		return null
	}

	return { init, get, upsert }
}
