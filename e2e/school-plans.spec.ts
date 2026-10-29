import { expect, test } from '@playwright/test'
import { NADAMAS_PRICING } from '../lib/pricing'
import { newSchoolSubscription, SUBSCRIPTION_TRIAL_MS } from '../lib/subscriptions/engine'
import type { SchoolSubscription } from '../lib/subscriptions/model'
import {
  hasSeat,
  planLimitMessage,
  type SchoolPlanLimits,
  schoolPlanLimits,
  seatKeys,
  seatUsage,
} from '../lib/subscriptions/plans'

const sub = (c: Partial<SchoolSubscription>) => c as SchoolSubscription
const basic: SchoolPlanLimits = { plan: 'basic', teachers: 5, students: 100 }

test('basic limits for a missing or plain subscription', () => {
  expect(schoolPlanLimits(null)).toEqual(basic)
  expect(schoolPlanLimits(sub({}))).toEqual(basic)
})

test('exempt without custom limits is unlimited', () => {
  expect(schoolPlanLimits(sub({ paymentExempt: true }))).toEqual({
    plan: 'unlimited',
    teachers: null,
    students: null,
  })
})

test('custom limits win', () => {
  expect(
    schoolPlanLimits(sub({ paymentExempt: true, customLimits: { teachers: 12, students: 300 } }))
  ).toEqual({ plan: 'custom', teachers: 12, students: 300 })
})

test('counts each swimmer once', () => {
  const keys = seatKeys({
    students: [
      { id: 'a', status: 'active' },
      { id: 'b', status: 'active' },
      { id: 'c', status: 'active' },
      { id: 'd', status: 'active', studentUserId: 'u1' },
      { id: 'e', status: 'suspended' },
    ],
    memberships: [
      { userId: 'u1', status: 'active', roles: ['student'] },
      { userId: 'u2', status: 'pending', roles: ['student'] },
    ],
  })
  expect(seatUsage(keys).students).toBe(4)
})

test('teachers exclude directors and inactive', () => {
  const keys = seatKeys({
    students: [],
    memberships: [
      { userId: 't1', status: 'active', roles: ['teacher'] },
      { userId: 't2', status: 'active', roles: ['teacher'] },
      { userId: 'd1', status: 'active', roles: ['director', 'teacher'] },
      { userId: 't3', status: 'suspended', roles: ['teacher'] },
    ],
  })
  expect(seatUsage(keys).teachers).toBe(2)
})

test('hasSeat blocks at the limit', () => {
  expect(hasSeat(basic, { teachers: 5, students: 99 }, 'teacher')).toBe(false)
  expect(hasSeat(basic, { teachers: 5, students: 99 }, 'student')).toBe(true)
})

test('messages', () => {
  expect(planLimitMessage(basic)).toBe(
    'Llegaste al límite de tu plan Básico (5 profes / 100 alumnos). Contáctanos para un plan personalizado.'
  )
  expect(planLimitMessage({ plan: 'custom', teachers: 12, students: 300 })).toBe(
    'Llegaste al límite de tu plan (12 profes / 300 alumnos). Contáctanos para ampliarlo.'
  )
})

test('trial is 30 days', () => {
  expect(NADAMAS_PRICING.trialDays).toBe(30)
  expect(SUBSCRIPTION_TRIAL_MS).toBe(30 * 86400000)
  expect(newSchoolSubscription('s', 'o', true, 0).trialEndsAt).toBe(30 * 86400000)
})
