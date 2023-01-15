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
	// FIXME bad api, should extract root domain of each subdomain then send it with object
	const subsUpsertErrs = await db.upsertNewSubdomains('memoryleaks.ir', Object.keys(subs))
	if (subsUpsertErrs) subsUpsertErrs.forEach(err => console.log(err.errmsg))
}

main()
