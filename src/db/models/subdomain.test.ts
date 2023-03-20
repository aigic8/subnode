import test from 'ava'
import { arrsAreEqual, initDB } from '../testHelpers'

test.serial('UPSERT should not fail', async t => {
	const projectName = 'memoryleaks'
	const rootDomain = 'memoryleaks.ir'
	const rootDomains = [rootDomain]
	const db = await initDB({
		projects: [projectName],
		rootDomains: { project: projectName, rootDomains },
	})

	const subdomains = ['wp.memoryleaks.ir', 'app1.memoryleaks.ir']
	await t.notThrowsAsync(
		db.subdomain.upsert(
			projectName,
			subdomains.map(subdomain => ({ rootDomain, subdomain }))
		)
	)
})

test.serial('GET should not fail', async t => {
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

	const dbSubdomains = await db.subdomain.get(projectName)

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

test.serial('GET after date should be applied', async t => {
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
	const dbSubdomains = await db.subdomain.get(projectName, after)
	t.is(dbSubdomains.length, 0)
})

test.serial('GET_WITH_IP should not fail', async t => {
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

	const subdomainsWithIP = await db.subdomain.getWithIp(projectName)
	t.is(subdomainsWithIP.length, 0)
})

test.serial('GET_WITH_IP after date should be used', async t => {
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
	const errors = await db.subdomain.ensureDNSState(projectName, {
		[subWithIP]: true,
	})
	if (errors) t.fail('subdomain.ensureDNSState failed with errors: ' + errors.toString())

	const after = new Date()
	after.setDate(after.getDate() + 2)
	const subdomainsWithIP = await db.subdomain.getWithIp(projectName, after)
	t.is(subdomainsWithIP.length, 0)
})

test.serial('ENSURE_DNS_STATE should work', async t => {
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
	const errors = await db.subdomain.ensureDNSState(projectName, {
		[subWithIP]: true,
		'app1.memoryleaks.ir': false,
	})
	t.is(errors, null)

	const subdomainsWithIP = await db.subdomain.getWithIp(projectName)
	t.is(subdomainsWithIP.length, 1)
	t.is(subdomainsWithIP[0].subdomain, subWithIP)
})

test.serial('ENSURE_DNS_STATE should not fail if subdomain already have ip', async t => {
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
	const errors = await db.subdomain.ensureDNSState(projectName, {
		[subWithIP]: true,
	})
	t.is(errors, null)

	const errors2 = await db.subdomain.ensureDNSState(projectName, {
		[subWithIP]: true,
	})
	t.is(errors2, null)

	const subdomainsWithIP = await db.subdomain.getWithIp(projectName)
	t.is(subdomainsWithIP.length, 1)
	t.is(subdomainsWithIP[0].subdomain, subWithIP)
})

test.todo('ENSURE_DNS_STATE should have error with a subdomain which does not exist')

test.serial('GET_WITH_HTTP should not fail', async t => {
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

	const subdomainsWithHTTP = await db.subdomain.getWithHTTP(projectName)
	t.is(subdomainsWithHTTP.length, 0)
})

test.serial('GET_WITH_HTTP after date should be used', async t => {
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
	const errors = await db.subdomain.ensureHTTPState(projectName, {
		[subWithHTTP]: true,
	})
	if (errors) t.fail('subdomain.ensureHTTPState failed with errors: ' + errors.toString())

	const after = new Date()
	after.setDate(after.getDate() + 2)
	const subdomainsWithHTTP = await db.subdomain.getWithHTTP(projectName, after)
	t.is(subdomainsWithHTTP.length, 0)
})

test.serial('ENSURE_HTTP_STATE should work', async t => {
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
	const errors = await db.subdomain.ensureHTTPState(projectName, {
		[subsWithHTTP]: true,
		'app1.memoryleaks.ir': false,
	})
	t.is(errors, null)

	const subdomainsWithHTTP = await db.subdomain.getWithHTTP(projectName)
	t.is(subdomainsWithHTTP.length, 1)
	t.is(subdomainsWithHTTP[0].subdomain, subsWithHTTP)
})

test.serial(
	'ENSURE_HTTP_STATE should not fail if subdomain already have http',
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
		const errors = await db.subdomain.ensureHTTPState(projectName, {
			[subsWithHTTP]: true,
		})
		t.is(errors, null)

		const errors2 = await db.subdomain.ensureHTTPState(projectName, {
			[subsWithHTTP]: true,
		})
		t.is(errors2, null)

		const subdomainsWithHTTP = await db.subdomain.getWithHTTP(projectName)
		t.is(subdomainsWithHTTP.length, 1)
		t.is(subdomainsWithHTTP[0].subdomain, subsWithHTTP)
	}
)

test.todo('ENSURE_HTTP_STATE should have error with a subdomain which does not exist')
