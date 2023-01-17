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
	const db = NewDB(DB_URI, DB_NAME)
	await db.initialize()
	await db.DEBUG_cleanDB()

	await db.createProject('memoryleaks')
	t.pass()
})

test.serial('createProject should error if project DOES exist', async t => {
	const db = NewDB(DB_URI, DB_NAME)
	await db.initialize()
	await db.DEBUG_cleanDB()

	const projectName = 'memoryleaks'
	await db.createProject(projectName)
	await t.throwsAsync(db.createProject(projectName))
})

test.serial('getProject should work', async t => {
	const db = NewDB(DB_URI, DB_NAME)
	await db.initialize()
	await db.DEBUG_cleanDB()

	const projectName = 'memoryleaks'
	await db.createProject(projectName)
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
	const db = NewDB(DB_URI, DB_NAME)
	await db.initialize()
	await db.DEBUG_cleanDB()

	const dbProject = await db.getProject('memoryleaks')
	t.is(dbProject, null)
})

test.serial('setProjectLastDnsProbed should work', async t => {
	const db = NewDB(DB_URI, DB_NAME)
	await db.initialize()
	await db.DEBUG_cleanDB()

	const projectName = 'memoryleaks'
	await db.createProject(projectName)

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
		const db = NewDB(DB_URI, DB_NAME)
		await db.initialize()
		await db.DEBUG_cleanDB()

		const projectName = 'memoryleaks'
		const date = new Date()
		await t.throwsAsync(db.setProjectLastDnsProbed(projectName, date))
	}
)

test.serial('upsertNewRootDomains should not fail', async t => {
	const db = NewDB(DB_URI, DB_NAME)
	await db.initialize()
	await db.DEBUG_cleanDB()

	const projectName = 'memoryleaks'
	await db.createProject(projectName)

	await t.notThrowsAsync(
		db.upsertNewRootDomains(projectName, ['memoryleaks.ir', 'memoryleaks2.ir'])
	)
})

test.serial('getRootDomains should not fail', async t => {
	const db = NewDB(DB_URI, DB_NAME)
	await db.initialize()
	await db.DEBUG_cleanDB()

	const projectName = 'memoryleaks'
	await db.createProject(projectName)

	const rootDomains = ['memoryleaks.ir', 'memoryleaks2.ir']
	await db.upsertNewRootDomains(projectName, rootDomains)

	const dbRootDomains = (await db.getRootDomains(projectName)).map(
		item => item.rootDomain
	)

	t.notThrows(() => arrsAreEqual(rootDomains, dbRootDomains))
})

test.serial('getRootDomains should not fail with no rootDomains', async t => {
	const db = NewDB(DB_URI, DB_NAME)
	await db.initialize()
	await db.DEBUG_cleanDB()

	const projectName = 'memoryleaks'
	await db.createProject(projectName)

	const dbRootDomains = await db.getRootDomains(projectName)
	t.is(dbRootDomains.length, 0)
})

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
