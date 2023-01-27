import { spawn } from 'child_process'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import * as readline from 'readline/promises'

export type APIReply<T> = { ok: true; data: T } | { ok: false; error: string }

export const makeAPIErr = (error: string) =>
	({ ok: false, error } as { ok: false; error: string })

interface GetSubsOptions {
	amassBin: string
	findomainBin: string
	subfinderBin: string
}

type SubsEvents = {
	sub: (sub: string) => void
	error: (error: Error) => void
	done: () => void
}

export function enumSubs(domains: string[], o: GetSubsOptions): TypedEmitter<SubsEvents> {
	let liveCmds = 3
	// TODO add option to load config for amass
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

	amassCmd.on('close', () => --liveCmds <= 0 && subsEmitter.emit('done'))
	findomainCmd.on('close', () => --liveCmds <= 0 && subsEmitter.emit('done'))
	subfinderCmd.on('close', () => --liveCmds <= 0 && subsEmitter.emit('done'))

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
	done: () => void
}

export function dnsProbe(dnsxBin: string, domains: string[]) {
	const emitter = new EventEmitter() as TypedEmitter<DnsSubEvents>
	const cmd = spawn(dnsxBin, ['-silent'])

	domains.forEach(domain => cmd.stdin.write(Buffer.from(domain + '\n')))
	cmd.stdin.end()

	cmd.on('error', err => emitter.emit('error', err))
	cmd.on('close', () => emitter.emit('done'))

	const dnsxSubs = readline.createInterface(cmd.stdout)
	dnsxSubs.on('line', line => line !== '' && emitter.emit('sub', line))

	return emitter
}

type HttpSubEevnts = {
	sub: (sub: string) => void
	error: (error: Error) => void
	done: () => void
}
export function httpProbe(httpxBin: string, domains: string[], rateLimit = 50) {
	const emitter = new EventEmitter() as TypedEmitter<HttpSubEevnts>
	const cmd = spawn(httpxBin, ['-rate-limit', rateLimit.toString()])

	domains.forEach(domain => cmd.stdin.write(Buffer.from(domain + '\n')))
	cmd.stdin.end()

	cmd.on('error', err => emitter.emit('error', err))
	cmd.on('close', () => emitter.emit('done'))

	const httpxSubs = readline.createInterface(cmd.stdout)
	httpxSubs.on(
		'line',
		line => line !== '' && emitter.emit('sub', normalizeHttpxDomain(line))
	)

	return emitter
}

const normalizeHttpxDomain = (raw: string) => new URL(raw).hostname
