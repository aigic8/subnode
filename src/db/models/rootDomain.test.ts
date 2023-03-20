import test from 'ava'
import { arrsAreEqual, initDB } from '../testHelpers'

test.serial('UPSERT should not fail', async t => {
	const projectName = 'memoryleaks'
	const db = await initDB({ projects: [projectName] })

	await t.notThrowsAsync(
		db.rootDomain.upsert(projectName, ['memoryleaks.ir', 'memoryleaks2.ir'])
	)
})

test.serial('GET should not fail', async t => {
	const projectName = 'memoryleaks'
	const rootDomains = ['memoryleaks.ir', 'memoryleaks2.ir']
	const db = await initDB({
		projects: [projectName],
		rootDomains: { project: projectName, rootDomains },
	})

	const dbRootDomains = (await db.rootDomain.get(projectName)).map(
		item => item.rootDomain
	)

	t.notThrows(() => arrsAreEqual(rootDomains, dbRootDomains))
})

test.serial('GET should not fail with no rootDomains', async t => {
	const projectName = 'memoryleaks'
	const db = await initDB({ projects: [projectName] })

	const dbRootDomains = await db.rootDomain.get(projectName)
	t.is(dbRootDomains.length, 0)
})
