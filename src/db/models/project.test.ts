import test from 'ava'
import { initDB } from '../testHelpers'

test.serial('ADD should create project without errors', async t => {
	const db = await initDB()

	await db.project.add('memoryleaks')
	t.pass()
})

test.serial('ADD should error if project DOES exist', async t => {
	const db = await initDB()

	const projectName = 'memoryleaks'
	await db.project.add(projectName)
	await t.throwsAsync(db.project.add(projectName))
})

test.serial('GET should work', async t => {
	const projectName = 'memoryleaks'
	const db = await initDB({ projects: [projectName] })

	const dbProject = await db.project.get(projectName)
	if (!dbProject) {
		t.fail('db project was null')
		return
	}
	t.is(dbProject.project, projectName)
	t.truthy(dbProject.createdAt)
	t.truthy(dbProject.lastDnsProbed)
})

test.serial("GET should return null when project doesn't exist", async t => {
	const db = await initDB()

	const dbProject = await db.project.get('memoryleaks')
	t.is(dbProject, null)
})

test.serial('SETLASTDNSPROBED should work', async t => {
	const projectName = 'memoryleaks'
	const db = await initDB({ projects: [projectName] })

	const date = new Date()
	date.setDate(date.getDate() + 2)
	await db.project.setLastDnsProbed(projectName, date)

	const dbProject = await db.project.get(projectName)
	if (!dbProject) {
		t.fail('db project was null')
		return
	}

	t.deepEqual(dbProject.lastDnsProbed, date)
})

test.serial('SETLASTDNSPROBED should fail if project DOES NOT exist', async t => {
	const db = await initDB()

	const projectName = 'memoryleaks'
	const date = new Date()
	await t.throwsAsync(db.project.setLastDnsProbed(projectName, date))
})
