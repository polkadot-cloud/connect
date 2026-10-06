// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { createSafeContext } from '@polkadot-cloud/hooks'
import { setStateWithRef } from '@polkadot-cloud/utils'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { defaultFeedback } from './defaults'
import { Ledger } from './device/ledger'
import type {
	AnyTransport,
	FeedbackMessage,
	HandleErrorFeedback,
	LedgerContextInterface,
	LedgerDeviceAddress,
	LedgerDeviceModel,
	LedgerResponse,
	MaybeString,
} from './types'
import { getLedgerDeviceName, getLedgerErrorType } from './utils'

export const [LedgerContext, useLedger] =
	createSafeContext<LedgerContextInterface>()

export const LedgerProvider = ({ children }: { children: ReactNode }) => {
	const generation = useRef(0)
	useEffect(
		() => () => {
			generation.current++
			void Ledger.unmount().catch(() => {})
		},
		[],
	)

	// Keep model feedback without persisting a device selection.
	const getDeviceModel = (): LedgerDeviceModel => Ledger.deviceModel

	// Store whether a Ledger device task is in progress
	const [isExecuting, setIsExecuting] = useState(false)

	// Store the latest status code received from a Ledger device
	const [statusCode, setStatusCode] = useState<LedgerResponse | null>(null)

	const resetStatusCode = () => setStatusCode(null)

	// Store the feedback message to display as the Ledger device is being interacted with
	const [feedback, setFeedbackState] =
		useState<FeedbackMessage>(defaultFeedback)
	const feedbackRef = useRef(feedback)

	const getFeedbackCode = () => feedbackRef.current
	const setFeedbackCode = (
		message: MaybeString,
		helpKey: MaybeString = null,
		params?: Record<string, string>,
	) =>
		setStateWithRef({ message, helpKey, params }, setFeedbackState, feedbackRef)
	const resetFeedback = () =>
		setStateWithRef(defaultFeedback, setFeedbackState, feedbackRef)

	// Set feedback message and status code together
	const setStatusFeedback = ({
		code,
		helpKey,
		message,
		params,
	}: HandleErrorFeedback) => {
		setStatusCode({ ack: 'failure', statusCode: code })
		setFeedbackCode(message, helpKey, params)
	}

	// Stores whether the Ledger device version has been checked. Used when signing transactions, not
	// when addresses are being imported
	const [integrityChecked, setIntegrityChecked] = useState(false)

	// Store the latest successful device response
	const [transportResponse, setTransportResponse] = useState<AnyTransport>(null)

	// Ignore results from tasks cancelled by reset or provider disposal.
	const runTask = async <T,>(
		task: () => Promise<T>,
		onSuccess?: (result: T) => void,
	): Promise<T | null> => {
		const current = generation.current
		setIsExecuting(true)
		try {
			const result = await task()
			if (current !== generation.current) return null
			onSuccess?.(result)
			return result
		} catch (err) {
			if (current === generation.current) handleErrors(err)
			return null
		} finally {
			if (current === generation.current) setIsExecuting(false)
		}
	}

	const checkRuntimeVersion = async () => {
		await runTask(
			async () => {
				const { app } = await Ledger.initialise()
				return Ledger.getVersion(app)
			},
			() => {
				resetFeedback()
				setIntegrityChecked(true)
			},
		)
	}

	const getAddress = async (accountIndex: number, ss58Prefix: number) => {
		const { app, deviceModel } = await Ledger.initialise()
		const result = await Ledger.getAddress(app, accountIndex, ss58Prefix)
		return { ...result, deviceModel }
	}

	const handleGetAddress = async (accountIndex: number, ss58Prefix: number) => {
		await runTask(
			() => getAddress(accountIndex, ss58Prefix),
			({ deviceModel, ...address }) => {
				setFeedbackCode('successfullyFetchedAddress')
				setTransportResponse({
					ack: 'success',
					statusCode: 'ReceivedAddress',
					options: { accountIndex },
					device: { deviceModel },
					body: [address],
				})
			},
		)
	}

	const fetchLedgerAddress = (
		accountIndex: number,
		ss58Prefix: number,
	): Promise<LedgerDeviceAddress | null> =>
		runTask(() => getAddress(accountIndex, ss58Prefix))

	const handleErrors = (err: unknown) => {
		const params = { device: getLedgerDeviceName(getDeviceModel()) }
		const feedback: Record<string, HandleErrorFeedback> = {
			timeout: {
				message: 'ledgerRequestTimeout',
				helpKey: 'Ledger Request Timeout',
				code: 'DeviceTimeout',
				params,
			},
			methodNotSupported: {
				message: 'methodNotSupported',
				code: 'MethodNotSupported',
			},
			nestingNotSupported: {
				message: 'missingNesting',
				code: 'NestingNotSupported',
			},
			deviceNotConnected: {
				message: 'connectLedgerToContinue',
				code: 'DeviceNotConnected',
				params,
			},
			outsideActiveChannel: {
				message: 'queuedTransactionRejected',
				helpKey: 'Wrong Transaction',
				code: 'WrongTransaction',
			},
			deviceBusy: {
				message: 'ledgerDeviceBusy',
				code: 'DeviceBusy',
				params,
			},
			deviceLocked: {
				message: 'unlockLedgerToContinue',
				code: 'DeviceLocked',
				params,
			},
			appNotOpen: {
				message: 'openAppOnLedger',
				helpKey: 'Open App On Ledger',
				code: 'AppNotOpen',
				params,
			},
			txVersionNotSupported: {
				message: 'txVersionNotSupported',
				code: 'TransactionVersionNotSupported',
			},
			transactionRejected: {
				message: 'transactionRejectedPending',
				helpKey: 'Ledger Rejected Transaction',
				code: 'TransactionRejected',
			},
		}
		setStatusFeedback(
			feedback[getLedgerErrorType(String(err))] || feedback.appNotOpen,
		)
		setIsExecuting(false)
	}

	// Helper to reset ledger state when a task is completed or cancelled. Device model is
	// intentionally preserved so subsequent modals can reference the detected device
	const handleResetLedgerTask = () => {
		generation.current++
		void Ledger.unmount().catch(() => {})
		setTransportResponse(null)
		setIsExecuting(false)
		resetStatusCode()
		resetFeedback()
		setIntegrityChecked(false)
	}

	return (
		<LedgerContext.Provider
			value={{
				getDeviceModel,
				integrityChecked,
				setIntegrityChecked,
				checkRuntimeVersion,
				transportResponse,
				isExecuting,
				setIsExecuting,
				statusCode,
				setStatusCode,
				resetStatusCode,
				getFeedbackCode,
				setFeedbackCode,
				resetFeedback,
				handleGetAddress,
				fetchLedgerAddress,
				handleResetLedgerTask,
				handleErrors,
				handleUnmount: handleResetLedgerTask,
			}}
		>
			{children}
		</LedgerContext.Provider>
	)
}
