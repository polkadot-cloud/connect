// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import type { DedotClient } from 'dedot'
import type { GenericSubstrateApi } from 'dedot/types'
import { BehaviorSubject } from 'rxjs'

// Shared registry of dedot api clients, keyed by network. Stays private to the
// package; access goes through the helpers in `./index.ts`.
//
// Uses Map instead of a plain object to avoid prototype-pollution risks from
// arbitrary network strings (e.g. __proto__, constructor).
export const _apis = new BehaviorSubject<
	Map<string, DedotClient<GenericSubstrateApi>>
>(new Map())
