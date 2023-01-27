import test from 'ava'
import { NewDB } from './db'

const DB_URI = 'mongodb://127.0.0.1:2727/'
const DB_NAME = 'subnode_test'

test.serial('initializes db without errors', async t => {
	const db = NewDB(DB_URI, DB_NAME)
	await t.notThrowsAsync(db.initialize())
	t.pass()
})

test.serial('createProject should create project without errors', async t => {
	const db = await initDB()

	await db.createProject('memoryleaks')
	t.pass()
})

test.serial('createProject should error if project DOES exist', async t => {
	const db = await initDB()

	const projectName = 'memoryleaks'
	await db.createProject(projectName)
	await t.throwsAsync(db.createProject(projectName))
})

test.serial('getProject should work', async t => {
	const projectName = 'memoryleaks'
	const db = await initDB({ projects: [projectName] })

	const dbProject = await db.getProject(projectName)
	if (!dbProject) {
		t.fail('db project was null')
		return
	}
	t.is(dbProject.project, projectName)
	t.truthy(dbProject.createdAt)
	t.truthy(dbProject.lastDnsProbed)
})

test.serial("getProject should return null when project doesn't exist", async t => {
	const db = await initDB()

	const dbProject = await db.getProject('memoryleaks')
	t.is(dbProject, null)
})

test.serial('setProjectLastDnsProbed should work', async t => {
	const projectName = 'memoryleaks'
	const db = await initDB({ projects: [projectName] })

	const date = new Date()
	date.setDate(date.getDate() + 2)
	await db.setProjectLastDnsProbed(projectName, date)

	const dbProject = await db.getProject(projectName)
	if (!dbProject) {
		t.fail('db project was null')
		return
	}

	t.deepEqual(dbProject.lastDnsProbed, date)
})

test.serial(
	'setProjectLastDnsProjebed should fail if project DOES NOT exist',
	async t => {
		const db = await initDB()

		const projectName = 'memoryleaks'
		const date = new Date()
		await t.throwsAsync(db.setProjectLastDnsProbed(projectName, date))
	}
)

test.serial('upsertNewRootDomains should not fail', async t => {
	const projectName = 'memoryleaks'
	const db = await initDB({ projects: [projectName] })

	await t.notThrowsAsync(
		db.upsertNewRootDomains(projectName, ['memoryleaks.ir', 'memoryleaks2.ir'])
	)
})

test.serial('getRootDomains should not fail', async t => {
	const projectName = 'memoryleaks'
	const rootDomains = ['memoryleaks.ir', 'memoryleaks2.ir']
	const db = await initDB({
		projects: [projectName],
		rootDomains: { project: projectName, rootDomains },
	})

	const dbRootDomains = (await db.getRootDomains(projectName)).map(
		item => item.rootDomain
	)

	t.notThrows(() => arrsAreEqual(rootDomains, dbRootDomains))
})

test.serial('getRootDomains should not fail with no rootDomains', async t => {
	const projectName = 'memoryleaks'
	const db = await initDB({ projects: [projectName] })

	const dbRootDomains = await db.getRootDomains(projectName)
	t.is(dbRootDomains.length, 0)
})

test.serial('upsertNewSubdomains should not fail', async t => {
	const projectName = 'memoryleaks'
	const rootDomain = 'memoryleaks.ir'
	const rootDomains = [rootDomain]
	const db = await initDB({
		projects: [projectName],
		rootDomains: { project: projectName, rootDomains },
	})

	const subdomains = ['wp.memoryleaks.ir', 'app1.memoryleaks.ir']
	await t.notThrowsAsync(
		db.upsertNewSubdomains(
			projectName,
			subdomains.map(subdomain => ({ rootDomain, subdomain }))
		)
	)
})

test.serial('getSubdomains should not fail', async t => {
	const projectName = 'memoryleaks'
	const rootDomain = 'memoryleaks.ir'
	const rootDomains = [rootDomain]
	const subdomains = ['wp.memoryleaks.ir', 'app1.memoryleaks.ir']
	const db = await initDB({
		projects: [projectName],
		rootDomains: { project: projectName, rootDomains },
		subdomains: {
			project: projectName,
			subdomains: subdomains.map(subdomain => ({ rootDomain, subdomain })),
		},
	})

	const dbSubdomains = await db.getSubdomains(projectName)

	dbSubdomains.forEach(item => t.is(item.rootDomain, rootDomain))
	dbSubdomains.forEach(item => t.is(item.hadIPFrom, null))
	dbSubdomains.forEach(item => t.is(item.hadHTTPFrom, null))
	t.notThrows(() =>
		arrsAreEqual(
			subdomains,
			dbSubdomains.map(item => item.subdomain)
		)
	)
})

test.serial('getSubdomains after date should be applied', async t => {
	const projectName = 'memoryleaks'
	const rootDomain = 'memoryleaks.ir'
	const rootDomains = [rootDomain]
	const subdomains = ['wp.memoryleaks.ir', 'app1.memoryleaks.ir']
	const db = await initDB({
		projects: [projectName],
		rootDomains: { project: projectName, rootDomains },
		subdomains: {
			project: projectName,
			subdomains: subdomains.map(subdomain => ({ rootDomain, subdomain })),
		},
	})

	const after = new Date()
	after.setDate(after.getDate() + 2)
	const dbSubdomains = await db.getSubdomains(projectName, after)
	t.is(dbSubdomains.length, 0)
})

test.serial('getSubdomainsWithIp should not fail', async t => {
	const projectName = 'memoryleaks'
	const rootDomain = 'memoryleaks.ir'
	const rootDomains = [rootDomain]
	const subdomains = ['wp.memoryleaks.ir', 'app1.memoryleaks.ir']
	const db = await initDB({
		projects: [projectName],
		rootDomains: { project: projectName, rootDomains },
		subdomains: {
			project: projectName,
			subdomains: subdomains.map(subdomain => ({ rootDomain, subdomain })),
		},
	})

	const subdomainsWithIP = await db.getSubdomainsWithIp(projectName)
	t.is(subdomainsWithIP.length, 0)
})

test.serial('getSubdomainsWithIp after date should be used', async t => {
	const projectName = 'memoryleaks'
	const rootDomain = 'memoryleaks.ir'
	const rootDomains = [rootDomain]
	const subdomains = ['wp.memoryleaks.ir', 'app1.memoryleaks.ir']
	const db = await initDB({
		projects: [projectName],
		rootDomains: { project: projectName, rootDomains },
		subdomains: {
			project: projectName,
			subdomains: subdomains.map(subdomain => ({ rootDomain, subdomain })),
		},
	})

	const subWithIP = 'wp.memoryleaks.ir'
	const errors = await db.ensureSubdomainsDNSState(projectName, {
		[subWithIP]: true,
	})
	if (errors) t.fail('ensureSubdomainsDNSState failed with errors: ' + errors.toString())

	const after = new Date()
	after.setDate(after.getDate() + 2)
	const subdomainsWithIP = await db.getSubdomainsWithIp(projectName, after)
	t.is(subdomainsWithIP.length, 0)
})

test.serial('ensureSubdomainDNSState should work', async t => {
	const projectName = 'memoryleaks'
	const rootDomain = 'memoryleaks.ir'
	const rootDomains = [rootDomain]
	const subdomains = ['wp.memoryleaks.ir', 'app1.memoryleaks.ir']
	const db = await initDB({
		projects: [projectName],
		rootDomains: { project: projectName, rootDomains },
		subdomains: {
			project: projectName,
			subdomains: subdomains.map(subdomain => ({ rootDomain, subdomain })),
		},
	})

	const subWithIP = 'wp.memoryleaks.ir'
	const errors = await db.ensureSubdomainsDNSState(projectName, {
		[subWithIP]: true,
		'app1.memoryleaks.ir': false,
	})
	t.is(errors, null)

	const subdomainsWithIP = await db.getSubdomainsWithIp(projectName)
	t.is(subdomainsWithIP.length, 1)
	t.is(subdomainsWithIP[0].subdomain, subWithIP)
})

test.serial(
	'ensureSubdomainDNSState should not fail if subdomain already have ip',
	async t => {
		const projectName = 'memoryleaks'
		const rootDomain = 'memoryleaks.ir'
		const rootDomains = [rootDomain]
		const subdomains = ['wp.memoryleaks.ir', 'app1.memoryleaks.ir']
		const db = await initDB({
			projects: [projectName],
			rootDomains: { project: projectName, rootDomains },
			subdomains: {
				project: projectName,
				subdomains: subdomains.map(subdomain => ({ rootDomain, subdomain })),
			},
		})

		const subWithIP = 'wp.memoryleaks.ir'
		const errors = await db.ensureSubdomainsDNSState(projectName, {
			[subWithIP]: true,
		})
		t.is(errors, null)

		const errors2 = await db.ensureSubdomainsDNSState(projectName, {
			[subWithIP]: true,
		})
		t.is(errors2, null)

		const subdomainsWithIP = await db.getSubdomainsWithIp(projectName)
		t.is(subdomainsWithIP.length, 1)
		t.is(subdomainsWithIP[0].subdomain, subWithIP)
	}
)

test.todo(
	'ensureSubdomainDNSState should have error with a subdomain which does not exist'
)

test.serial('getSubdomainsWithHTTP should not fail', async t => {
	const projectName = 'memoryleaks'
	const rootDomain = 'memoryleaks.ir'
	const rootDomains = [rootDomain]
	const subdomains = ['wp.memoryleaks.ir', 'app1.memoryleaks.ir']
	const db = await initDB({
		projects: [projectName],
		rootDomains: { project: projectName, rootDomains },
		subdomains: {
			project: projectName,
			subdomains: subdomains.map(subdomain => ({ rootDomain, subdomain })),
		},
	})

	const subdomainsWithHTTP = await db.getSubdomainsWithHTTP(projectName)
	t.is(subdomainsWithHTTP.length, 0)
})

test.serial('getSubdomainsWithHTTP after date should be used', async t => {
	const projectName = 'memoryleaks'
	const rootDomain = 'memoryleaks.ir'
	const rootDomains = [rootDomain]
	const subdomains = ['wp.memoryleaks.ir', 'app1.memoryleaks.ir']
	const db = await initDB({
		projects: [projectName],
		rootDomains: { project: projectName, rootDomains },
		subdomains: {
			project: projectName,
			subdomains: subdomains.map(subdomain => ({ rootDomain, subdomain })),
		},
	})

	const subWithHTTP = 'wp.memoryleaks.ir'
	const errors = await db.ensureSubdomainsHTTPState(projectName, {
		[subWithHTTP]: true,
	})
	if (errors) t.fail('ensureSubdomainsHTTPState failed with errors: ' + errors.toString())

	const after = new Date()
	after.setDate(after.getDate() + 2)
	const subdomainsWithHTTP = await db.getSubdomainsWithHTTP(projectName, after)
	t.is(subdomainsWithHTTP.length, 0)
})

test.serial('ensureSubdomainsHTTPState should work', async t => {
	const projectName = 'memoryleaks'
	const rootDomain = 'memoryleaks.ir'
	const rootDomains = [rootDomain]
	const subdomains = ['wp.memoryleaks.ir', 'app1.memoryleaks.ir']
	const db = await initDB({
		projects: [projectName],
		rootDomains: { project: projectName, rootDomains },
		subdomains: {
			project: projectName,
			subdomains: subdomains.map(subdomain => ({ rootDomain, subdomain })),
		},
	})

	const subsWithHTTP = 'wp.memoryleaks.ir'
	const errors = await db.ensureSubdomainsHTTPState(projectName, {
		[subsWithHTTP]: true,
		'app1.memoryleaks.ir': false,
	})
	t.is(errors, null)

	const subdomainsWithHTTP = await db.getSubdomainsWithHTTP(projectName)
	t.is(subdomainsWithHTTP.length, 1)
	t.is(subdomainsWithHTTP[0].subdomain, subsWithHTTP)
})

test.serial(
	'ensureSubdomainsHTTPState should not fail if subdomain already have http',
	async t => {
		const projectName = 'memoryleaks'
		const rootDomain = 'memoryleaks.ir'
		const rootDomains = [rootDomain]
		const subdomains = ['wp.memoryleaks.ir', 'app1.memoryleaks.ir']
		const db = await initDB({
			projects: [projectName],
			rootDomains: { project: projectName, rootDomains },
			subdomains: {
				project: projectName,
				subdomains: subdomains.map(subdomain => ({ rootDomain, subdomain })),
			},
		})

		const subsWithHTTP = 'wp.memoryleaks.ir'
		const errors = await db.ensureSubdomainsHTTPState(projectName, {
			[subsWithHTTP]: true,
		})
		t.is(errors, null)

		const errors2 = await db.ensureSubdomainsHTTPState(projectName, {
			[subsWithHTTP]: true,
		})
		t.is(errors2, null)

		const subdomainsWithHTTP = await db.getSubdomainsWithHTTP(projectName)
		t.is(subdomainsWithHTTP.length, 1)
		t.is(subdomainsWithHTTP[0].subdomain, subsWithHTTP)
	}
)

test.todo(
	'ensureSubdomainsHTTPState should have error with a subdomain which does not exist'
)

interface DBInitialData {
	projects?: string[]
	rootDomains?: { project: string; rootDomains: string[] }
	subdomains?: {
		project: string
		subdomains: { rootDomain: string; subdomain: string }[]
	}
}
async function initDB(initialData?: DBInitialData) {
	const db = NewDB(DB_URI, DB_NAME)
	await db.initialize()
	await db.DEBUG_cleanDB()

	if (initialData?.projects) {
		await Promise.all(initialData.projects.map(db.createProject))
	}

	if (initialData?.rootDomains) {
		const { project, rootDomains } = initialData.rootDomains
		await db.upsertNewRootDomains(project, rootDomains)
	}

	if (initialData?.subdomains) {
		const { project, subdomains } = initialData.subdomains
		await db.upsertNewSubdomains(project, subdomains)
	}

	return db
}

function arrsAreEqual(arr1: string[], arr2: string[]): void {
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
