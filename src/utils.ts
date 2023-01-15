import { spawn } from 'child_process'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import * as readline from 'readline/promises'

interface GetSubsOptions {
	amassBin: string
	findomainBin: string
	subfinderBin: string
}

type SubsEvents = {
	sub: (sub: string) => void
	error: (error: Error) => void
}

export function enumSubs(domains: string[], o: GetSubsOptions): TypedEmitter<SubsEvents> {
	const domainsStr = domains.join(',')
	const subsEmitter = new EventEmitter() as TypedEmitter<SubsEvents>
	const amassCmd = spawn(o.amassBin, ['enum', '-passive', '-nocolor', '-d', domainsStr])
	const findomainCmd = spawn(o.findomainBin, ['--quiet', '--stdin'])
	const subfinderCmd = spawn(o.subfinderBin, [
		'-silent',
		'-no-color',
		'-all',
		'-d',
		domainsStr,
	])

	domains.forEach(domain => findomainCmd.stdin.write(Buffer.from(domain + '\n')))
	findomainCmd.stdin.end()

	amassCmd.on('error', err => subsEmitter.emit('error', err))
	findomainCmd.on('error', err => subsEmitter.emit('error', err))
	subfinderCmd.on('error', err => subsEmitter.emit('error', err))

	const amassSubs = readline.createInterface(amassCmd.stdout)
	const findomainSubs = readline.createInterface(findomainCmd.stdout)
	const subfinderSubs = readline.createInterface(subfinderCmd.stdout)

	amassSubs.on('line', line => line !== '' && subsEmitter.emit('sub', line))
	findomainSubs.on('line', line => line !== '' && subsEmitter.emit('sub', line))
	subfinderSubs.on('line', line => line !== '' && subsEmitter.emit('sub', line))

	return subsEmitter
}

type DnsSubEvents = {
	sub: (sub: string) => void
	error: (error: Error) => void
}

export function dnsProbe(dnsxBin: string, domains: string[]) {
	const emitter = new EventEmitter() as TypedEmitter<DnsSubEvents>
	const cmd = spawn(dnsxBin, ['-silent'])

	domains.forEach(domain => cmd.stdin.write(Buffer.from(domain + '\n')))
	cmd.stdin.end()

	cmd.on('error', err => emitter.emit('error', err))

	const dnsxSubs = readline.createInterface(cmd.stdout)
	dnsxSubs.on('line', line => line !== '' && emitter.emit('sub', line))

	return emitter
}
