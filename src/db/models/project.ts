import { Db } from 'mongodb'

export interface Project {
	project: string
	lastDnsProbed: Date
	createdAt: Date
}

export default function ProjectModel(db: Db, collName = 'projects') {
	const coll = db.collection<Project>(collName)

	const init = async () => {
		await coll.createIndex({ project: 1 }, { unique: true })
	}

	const get = (project: string) => {
		return coll.findOne({ project })
	}

	const add = async (project: string) => {
		await coll.insertOne({ project, createdAt: new Date(), lastDnsProbed: new Date() })
	}

	const setLastDnsProbed = async (project: string, lastDnsProbed: Date) => {
		const result = await coll.updateOne({ project }, { $set: { lastDnsProbed } })
		if (result.modifiedCount === 0) throw new Error('project not found')
	}

	return { init, get, add, setLastDnsProbed }
}
