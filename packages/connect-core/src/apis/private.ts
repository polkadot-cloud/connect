// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import type { DedotClient } from 'dedot'
import type { GenericSubstrateApi } from 'dedot/types'
import { BehaviorSubject } from 'rxjs'

// Shared registry of dedot api clients, keyed by network. Stays private to the
// package; access goes through the helpers in `./index.ts`.
export const _apis = new BehaviorSubject<
	Record<string, DedotClient<GenericSubstrateApi>>
>({})
