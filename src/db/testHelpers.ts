import { NewDB } from './db'

export const DB_URI = 'mongodb://127.0.0.1:27017/'
export const DB_NAME = 'subnode_test'

export interface DBInitialData {
	projects?: string[]
	rootDomains?: { project: string; rootDomains: string[] }
	subdomains?: {
		project: string
		subdomains: { rootDomain: string; subdomain: string }[]
	}
}

export async function initDB(initialData?: DBInitialData) {
	const db = NewDB(DB_URI, DB_NAME)
	await db.initialize()
	await db.DEBUG_cleanDB()

	if (initialData?.projects) {
		await Promise.all(initialData.projects.map(db.project.add))
	}

	if (initialData?.rootDomains) {
		const { project, rootDomains } = initialData.rootDomains
		await db.rootDomain.upsert(project, rootDomains)
	}

	if (initialData?.subdomains) {
		const { project, subdomains } = initialData.subdomains
		await db.subdomain.upsert(project, subdomains)
	}

	return db
}

export function arrsAreEqual(arr1: string[], arr2: string[]): void {
	if (arr1.length !== arr2.length)
		throw new Error(
			`arrays are not same length: arr1 = ${arr1.length}, arr2 = ${arr2.length}`
		)

	const map1: { [key: string]: boolean } = {}
	arr1.forEach(item => (map1[item] = false))

	arr2.forEach(item => {
		if (!(item in map1) || map1[item] === true) throw new Error('arrays are not the same')
		map1[item] = true
	})
}
