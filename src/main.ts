import { NewDB } from './db/db'
import { enumSubs } from './utils'

async function main() {
	// FIXME
	const subsEvents = enumSubs(['memoryleaks.ir', 'zoomit.ir'], {
		amassBin: 'bin/amass',
		findomainBin: 'bin/findomain',
		subfinderBin: 'bin/subfinder',
	})

	const subs: { [key: string]: boolean } = {}
	subsEvents.on('sub', sub => {
		if (!(sub in subs)) subs[sub] = true
	})

	subsEvents.on('error', err => console.error('ERROR', err))

	const db = NewDB('', '') // FIXME
	const rootDomain = 'memoryleaks.ir'
	const subsUpsertErrs = await db.upsertNewSubdomains(
		'memoryleaks',
		Object.keys(subs).map(subdomain => ({ rootDomain, subdomain }))
	)
	if (subsUpsertErrs) subsUpsertErrs.forEach(err => console.log(err.errmsg))
}

main()
