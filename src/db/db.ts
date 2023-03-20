import { MongoClient } from 'mongodb'
import ProjectModel from './models/project'
import RootDomainModel from './models/rootDomain'
import SubdomainModel from './models/subdomain'

export { Project } from './models/project'
export { RootDomain } from './models/rootDomain'
export { Subdomain } from './models/subdomain'

export type DB = ReturnType<typeof NewDB>

const PROJECTS_COL = 'projects'
const ROOT_DOMAINS_COL = 'rootDomains'
const SUBDOMAINS_COL = 'subdomains'

export function NewDB(URI: string, dbName: string) {
	const client = new MongoClient(URI)
	const db = client.db(dbName)

	const { init: projectInit, ...project } = ProjectModel(db, PROJECTS_COL)
	const { init: rootDomainInit, ...rootDomain } = RootDomainModel(db, ROOT_DOMAINS_COL)
	const { init: subdomainInit, ...subdomain } = SubdomainModel(db, SUBDOMAINS_COL)

	const initialize = async () => {
		await projectInit()
		await rootDomainInit()
		await subdomainInit()
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
		project,
		rootDomain,
		subdomain,
		DEBUG_cleanDB,
	}
}
