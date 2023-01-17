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
