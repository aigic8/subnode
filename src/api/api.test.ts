import test, { ExecutionContext } from 'ava'
import { NewDB, Project, RootDomain, Subdomain } from '../db/db'
import { App, ServerApp } from './api'
import status from 'http-status'
import { Response } from 'light-my-request'
import { APIReply } from './utils'

const DB_URI = 'mongodb://127.0.0.1:2727/'
const DB_NAME = 'subnode_test'

test.serial('put new project: should not fail', async t => {
	const { inject } = await initializeTest()
	const resp = await inject.putNewProject('memoryleaks')
	isOK(t, resp)
})

test.serial(
	'put new project: should respond BAD_REQUEST without project in body',
	async t => {
		const { inject } = await initializeTest()
		const resp = await inject.putNewProject()
		isAPIError(t, resp, status.BAD_REQUEST)
	}
)

test.serial('get project: should not fail', async t => {
	const { inject } = await initializeTest()

	const projectName = 'memoryleaks'
	await inject.putNewProject(projectName)
	const resp = await inject.getProject(projectName)

	const data = isOK(t, resp) as { project: Project }
	t.is(data.project.project, projectName)
})

test.serial('get project: should respond NOT_FOUND without project param', async t => {
	const { inject } = await initializeTest()
	const resp = await inject.getProject()
	isAPIError(t, resp, status.NOT_FOUND)
})

test.serial(
	'get project: should respond NOT_FOUND if project DOES NOT exist',
	async t => {
		const { inject } = await initializeTest()
		const resp = await inject.getProject('test')
		isAPIError(t, resp, status.NOT_FOUND)
	}
)

test.serial('get subdomains: should not fail', async t => {
	const { inject, db } = await initializeTest()

	const projectName = 'memoryleaks'
	const rootDomain = 'memoryleaks.ir'
	const subdomains = [
		{ rootDomain: rootDomain, subdomain: 'wp.memoryleaks.ir' },
		{ rootDomain: rootDomain, subdomain: 'cdn.memoryleaks.ir' },
	]

	await inject.putNewProject(projectName)
	// FIXME use api instead of db
	await db.upsertNewSubdomains(projectName, subdomains)
	const resp = await inject.getSubdomains(projectName)

	const data = isOK(t, resp) as { subdomains: Subdomain[] }
	const { subdomains: respSubs } = data
	respSubs.forEach(item => t.is(item.project, projectName))
	respSubs.forEach(item => t.is(item.rootDomain, rootDomain))

	const respSubsStr = respSubs.map(item => item.subdomain)
	const subsStr = subdomains.map(item => item.subdomain)
	arrsAreEqual(respSubsStr, subsStr)
})

test.serial(
	'get subdomains: should respond BAD_REQUEST without project in body',
	async t => {
		const { inject } = await initializeTest()
		const resp = await inject.getSubdomains()
		isAPIError(t, resp, status.BAD_REQUEST)
	}
)

test.serial(
	'get subdomains: should return NOT_FOUND if project does not exist',
	async t => {
		const { inject } = await initializeTest()
		const resp = await inject.getSubdomains('memoryleaks')
		isAPIError(t, resp, status.NOT_FOUND)
	}
)

test.serial('get subodmains: after query should be used', async t => {
	const { inject, db } = await initializeTest()

	const projectName = 'memoryleaks'
	const rootDomain = 'memoryleaks.ir'
	const subdomains = [
		{ rootDomain: rootDomain, subdomain: 'wp.memoryleaks.ir' },
		{ rootDomain: rootDomain, subdomain: 'cdn.memoryleaks.ir' },
	]
	const after = new Date()
	after.setDate(after.getDate() + 2)

	await inject.putNewProject(projectName)
	// FIXME use api instead of db
	await db.upsertNewSubdomains(projectName, subdomains)
	const resp = await inject.getSubdomains(projectName, after)

	const data = isOK(t, resp) as { subdomains: Subdomain[] }
	t.is(data.subdomains.length, 0)
})

test.serial('put new root domains: should not fail', async t => {
	const { inject } = await initializeTest()
	const projectName = 'memoryleaks'
	const rootDomains = ['memoryleaks.ir', 'memoryleaks2.ir']

	await inject.putNewProject(projectName)
	const resp = await inject.putNewRootDomains(projectName, rootDomains)
	isOK(t, resp)
})

test.serial(
	'put new root domains: should respond NOT_FOUND if project does not exist',
	async t => {
		const { inject } = await initializeTest()
		const projectName = 'memoryleaks'
		const rootDomains = ['memoryleaks.ir', 'memoryleaks2.ir']

		const resp = await inject.putNewRootDomains(projectName, rootDomains)
		isAPIError(t, resp, status.NOT_FOUND)
	}
)

test.serial(
	'put new root domains: should respond BAD_REQUEST if project is empty',
	async t => {
		const { inject } = await initializeTest()
		const rootDomains = ['memoryleaks.ir', 'memoryleaks2.ir']
		const resp = await inject.putNewRootDomains(undefined, rootDomains)
		isAPIError(t, resp, status.BAD_REQUEST)
	}
)

test.serial(
	'put new root domains: should respond BAD_REQUEST if rootDomains is empty',
	async t => {
		const { inject } = await initializeTest()
		const projectName = 'memoryleaks'
		const resp = await inject.putNewRootDomains(projectName)
		isAPIError(t, resp, status.BAD_REQUEST)
	}
)

test.serial('get root domains: should not fail', async t => {
	const { inject } = await initializeTest()
	const projectName = 'memoryleaks'
	const rootDomains = ['memoryleaks.ir', 'memoryleaks2.ir']

	await inject.putNewProject(projectName)
	await inject.putNewRootDomains(projectName, rootDomains)
	const resp = await inject.getRootDomains(projectName)

	const data = isOK(t, resp) as { rootDomains: RootDomain[] }
	data.rootDomains.forEach(item => t.is(item.project, projectName))

	const respRootDomainsStr = data.rootDomains.map(item => item.rootDomain)
	arrsAreEqual(respRootDomainsStr, rootDomains)
})

test.serial(
	'get root domains: should respond NOT_FOUND if project does not exist',
	async t => {
		const { inject } = await initializeTest()
		const projectName = 'memoryleaks'
		const resp = await inject.getRootDomains(projectName)
		isAPIError(t, resp, status.NOT_FOUND)
	}
)

test.serial(
	'get root domains: should respond BAD_REQUEST if project is empty',
	async t => {
		const { inject } = await initializeTest()
		const projectName = 'memoryleaks'
		const rootDomains = ['memoryleaks.ir', 'memoryleaks2.ir']

		await inject.putNewProject(projectName)
		await inject.putNewRootDomains(projectName, rootDomains)
		const resp = await inject.getRootDomains()
		isAPIError(t, resp, status.BAD_REQUEST)
	}
)

async function initializeTest(logger = false) {
	const db = NewDB(DB_URI, DB_NAME)
	const app = App({ db, logger })
	await db.DEBUG_cleanDB()
	return { db, app, inject: Inject(app) }
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

function isAPIError(t: ExecutionContext, resp: Response, status: number) {
	t.is(resp.statusCode, status)
	const data = JSON.parse(resp.body) as APIReply<any>
	t.is(data.ok, false)
}

function isOK(t: ExecutionContext, resp: Response) {
	t.is(resp.statusCode, status.OK)
	const data = JSON.parse(resp.body) as APIReply<any>
	if (data.ok !== true) {
		t.fail('response is not ok')
		return
	}
	return data.data
}

function Inject(app: ServerApp) {
	const getProject = (project = '') =>
		app.DEBUG_inject({
			method: 'GET',
			url: `/api/projects/${project}`,
		})

	const putNewProject = (project?: string) =>
		app.DEBUG_inject({
			method: 'PUT',
			url: '/api/projects/new',
			payload: project ? { project } : {},
		})

	const getSubdomains = (project = '', after?: Date) =>
		app.DEBUG_inject({
			method: 'GET',
			url: `/api/subdomains/${project}`,
			query: after ? { after: after.toString() } : {},
		})

	const getRootDomains = (project = '') =>
		app.DEBUG_inject({
			method: 'GET',
			url: `/api/root_domains/${project}`,
		})

	const putNewRootDomains = (project?: string, rootDomains?: string[]) => {
		const payload = {} as any
		if (project) payload.project = project
		if (rootDomains) payload.rootDomains = rootDomains

		return app.DEBUG_inject({
			method: 'PUT',
			url: '/api/root_domains/new',
			payload,
		})
	}

	return { getProject, putNewProject, getSubdomains, getRootDomains, putNewRootDomains }
}
