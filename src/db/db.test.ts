import test from 'ava'
import { NewDB } from './db'
import { DB_NAME, DB_URI } from './testHelpers'

test.serial('initializes db without errors', async t => {
	const db = NewDB(DB_URI, DB_NAME)
	await t.notThrowsAsync(db.initialize())
	t.pass()
})
