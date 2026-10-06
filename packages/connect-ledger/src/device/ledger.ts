// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import {
	type DeviceManagementKit,
	DeviceManagementKitBuilder,
	type DeviceSessionId,
	GetAppAndVersionCommand,
	LEDGER_VENDOR_ID,
	isSuccessCommandResult,
} from '@ledgerhq/device-management-kit'
import {
	type SignerPolkadot,
	SignerPolkadotBuilder,
} from '@ledgerhq/device-signer-kit-polkadot'
import {
	type WebHidTransport,
	webHidIdentifier,
	webHidTransportFactory,
} from '@ledgerhq/device-transport-kit-web-hid'
import { decodeAddress, encodeAddress, u8aToHex } from 'dedot/utils'
import type { LedgerDeviceAddress, LedgerDeviceModel } from '../types'
import { getLedgerDeviceModel } from '../utils'
import { ledgerAction, ledgerSdkError, waitFor } from './actions'

export interface LedgerApp {
	getAddress(
		path: string,
		prefix: number,
		confirm: boolean,
	): Promise<LedgerDeviceAddress>
}

export interface LedgerConnectionOptions {
	signal?: AbortSignal
	/** Disable the chooser when permission was granted in a separate extension tab. */
	requestDevice?: boolean
}

export function ledgerAccountPath(index: number): string {
	if (!Number.isInteger(index) || index < 0 || index > 0x7fff_ffff)
		throw new Error('Invalid Ledger account index.')
	return `m/44'/354'/${index}'/0'/0'`
}

interface Session {
	dmk: DeviceManagementKit
	controller: AbortController
	sessionId?: DeviceSessionId
	app?: LedgerApp
	signer?: SignerPolkadot
	closing?: Promise<void>
	connecting?: Promise<DeviceSessionId>
	device?: HIDDevice
	inputHandler?: HIDDevice['oninputreport']
	handles?: { device: HIDDevice; inputHandler: HIDDevice['oninputreport'] }[]
	dispose(): void
	destroy(): void
}

/** A UI-owned DMK session. No private material or account persistence. */
export function createLedgerAdapter(timeoutMs = 90_000) {
	let session: Session | undefined
	let deviceModel: LedgerDeviceModel = 'unknown'
	const close = (owned: Session): Promise<void> => {
		owned.closing ??= (async () => {
			owned.controller.abort(
				new DOMException('Ledger operation cancelled.', 'AbortError'),
			)
			owned.dispose()
			try {
				owned.sessionId ??= await owned.connecting?.catch(() => undefined)
				// WebHID installs its callback before open, even if open fails.
				if (!owned.device) {
					for (const handle of owned.handles || []) {
						if (handle.device.oninputreport !== handle.inputHandler)
							handle.device.oninputreport = null
					}
				}
				if (owned.device) {
					if (owned.device.oninputreport === owned.inputHandler)
						owned.device.oninputreport = null
					// DMK's disconnect initiates HID close without awaiting it.
					// Finish the browser close before releasing this adapter for reuse.
					if (owned.device.opened) await owned.device.close()
				}
				if (owned.sessionId)
					await owned.dmk.disconnect({ sessionId: owned.sessionId })
			} finally {
				owned.dmk.close()
				owned.destroy()
				if (session === owned) session = undefined
			}
		})()
		return owned.closing
	}
	const requireSession = (app: LedgerApp) => {
		if (
			!session ||
			session.app !== app ||
			!session.sessionId ||
			!session.signer
		)
			throw new DOMException(
				'Ledger session is no longer active.',
				'AbortError',
			)
		session.controller.signal.throwIfAborted()
		return session as Session & {
			sessionId: DeviceSessionId
			signer: SignerPolkadot
		}
	}
	const run = async <T>(
		app: LedgerApp,
		task: (owned: ReturnType<typeof requireSession>) => Promise<T>,
	): Promise<T> => {
		const owned = requireSession(app)
		try {
			return await task(owned)
		} finally {
			await close(owned)
		}
	}
	return {
		get deviceModel() {
			return deviceModel
		},
		get isPaired() {
			return Boolean(session?.sessionId)
		},
		async initialise(options: LedgerConnectionOptions = {}) {
			options.signal?.throwIfAborted()
			if (session) throw new Error('Ledger Device is busy.')
			let transport: WebHidTransport | undefined
			const dmk = new DeviceManagementKitBuilder()
				.addTransport((args) => {
					// DMK's Transport interface omits WebHID's disposal method.
					transport = webHidTransportFactory(args) as WebHidTransport
					return transport
				})
				.build()
			const controller = new AbortController()
			const abort = () => controller.abort(options.signal?.reason)
			options.signal?.addEventListener('abort', abort, { once: true })
			const timeout = setTimeout(
				() => controller.abort(new Error('Timeout: Ledger request timed out.')),
				timeoutMs,
			)
			const owned: Session = {
				dmk,
				controller,
				destroy: () => transport?.destroy(),
				dispose: () => {
					clearTimeout(timeout)
					options.signal?.removeEventListener('abort', abort)
				},
			}
			session = owned
			const signal = controller.signal
			try {
				if (!dmk.isEnvironmentSupported())
					throw new Error('WebHID is not supported.')
				// The kit initially emits an empty cached list, before getDevices finishes.
				// Check existing grants first so repeat operations do not summon a chooser.
				const permitted = (
					await waitFor(navigator.hid.getDevices(), signal)
				).some(({ vendorId }) => vendorId === LEDGER_VENDOR_ID)
				signal.throwIfAborted()
				if (!permitted && options.requestDevice === false)
					throw new Error(
						'NoAccessibleDeviceError: Connect Ledger to continue.',
					)
				const discovered = permitted
					? (
							await waitFor(
								dmk.listenToAvailableDevices({ transport: webHidIdentifier }),
								signal,
								(devices) => devices.length > 0,
							)
						)[0]
					: await waitFor(
							dmk.startDiscovering({ transport: webHidIdentifier }),
							signal,
						)
				const handles = (
					await waitFor(navigator.hid.getDevices(), signal)
				).filter(({ vendorId }) => vendorId === LEDGER_VENDOR_ID)
				signal.throwIfAborted()
				if (handles.some((device) => device.opened))
					throw new Error('Ledger Device is busy.')
				owned.handles = handles.map((device) => ({
					device,
					inputHandler: device.oninputreport,
				}))
				const disconnected = (event: HIDConnectionEvent) => {
					if (event.device === owned.device)
						controller.abort(
							new Error('Ledger disconnected. Reconnect the device.'),
						)
				}
				navigator.hid.addEventListener('disconnect', disconnected, { signal })
				const connecting = dmk
					.connect({
						device: discovered,
						sessionRefresherOptions: { isRefresherDisabled: true },
					})
					.then((sessionId) => {
						owned.device = handles.find((device) => device.opened)
						owned.inputHandler = owned.device?.oninputreport
						return sessionId
					})
				// A browser open cannot be cancelled. Cleanup waits for this owned open;
				// a later operation cannot reuse its HID handle before it finishes.
				owned.connecting = connecting
				owned.sessionId = await waitFor(connecting, signal)
				signal.throwIfAborted()
				deviceModel = getLedgerDeviceModel(discovered.deviceModel.name)
				owned.signer = new SignerPolkadotBuilder({
					dmk,
					sessionId: owned.sessionId,
				}).build()
				const app: LedgerApp = {
					async getAddress(path, prefix, confirm) {
						const { signer } = requireSession(app)
						const response = await ledgerAction(
							signer.getAddress(path.replace(/^m\//, ''), prefix, {
								checkOnDevice: confirm,
								// Keep the existing manual Polkadot-app flow, with no manager API calls.
								skipOpenApp: true,
							}),
							signal,
						)
						const publicKey = u8aToHex(response.publicKey)
						if (
							response.publicKey.length !== 32 ||
							u8aToHex(decodeAddress(response.address)) !== publicKey
						)
							throw new Error(
								'Ledger returned an inconsistent account address.',
							)
						return {
							address: encodeAddress(response.publicKey, prefix),
							pubKey: publicKey.slice(2),
						}
					},
				}
				owned.app = app
				return {
					app,
					productName: discovered.deviceModel.name,
					deviceModel,
				}
			} catch (error) {
				await close(owned)
				throw signal.aborted && options.signal?.aborted
					? options.signal.reason
					: ledgerSdkError(error)
			}
		},
		getVersion: (app: LedgerApp) =>
			run(app, async (owned) => {
				const result = await waitFor(
					owned.dmk.sendCommand({
						sessionId: owned.sessionId,
						command: new GetAppAndVersionCommand(),
					}),
					owned.controller.signal,
				)
				if (!isSuccessCommandResult(result)) throw ledgerSdkError(result.error)
				if (result.data.name !== 'Polkadot')
					throw new Error('Open the Polkadot app on Ledger.')
				return result.data
			}),
		getAddress: (app: LedgerApp, index: number, prefix: number) =>
			run(app, () => app.getAddress(ledgerAccountPath(index), prefix, false)),
		signPayload: (
			app: LedgerApp,
			index: number,
			payload: Uint8Array,
			metadata: Uint8Array,
		) =>
			run(app, async ({ signer, controller }) => {
				const signature = await ledgerAction(
					signer.signTransaction(
						ledgerAccountPath(index).slice(2),
						payload,
						metadata,
						{
							skipOpenApp: true,
						},
					),
					controller.signal,
				)
				if (signature.length !== 65 || signature[0] !== 0)
					throw new Error('Ledger returned an invalid Ed25519 signature.')
				return { signature }
			}),
		async unmount(app?: LedgerApp) {
			if (session && (!app || session.app === app)) await close(session)
		},
	}
}

export type LedgerAdapter = ReturnType<typeof createLedgerAdapter>
export const Ledger = createLedgerAdapter()
