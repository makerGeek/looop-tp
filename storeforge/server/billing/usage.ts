import { and, eq, sql } from 'drizzle-orm'
import { useDb } from '../db/index'
import { usageCounters } from '../db/schema'
import { buildLimitFor, planFor } from './plans'
import type { BuildUsage } from '../ai/agent'

/** Billing periods are UTC calendar months, so the key is derivable anywhere. */
export function currentPeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

export interface UsageSnapshot {
  period: string
  aiBuilds: number
  buildLimit: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  remaining: number
}

export async function usageFor(orgId: string): Promise<UsageSnapshot> {
  const period = currentPeriod()
  const [row] = await useDb().select().from(usageCounters)
    .where(and(eq(usageCounters.orgId, orgId), eq(usageCounters.periodStart, period)))
    .limit(1)

  const buildLimit = buildLimitFor(await planFor(orgId))
  const aiBuilds = row?.aiBuilds ?? 0

  return {
    period,
    aiBuilds,
    buildLimit,
    inputTokens: row?.inputTokens ?? 0,
    outputTokens: row?.outputTokens ?? 0,
    cacheReadTokens: row?.cacheReadTokens ?? 0,
    remaining: Math.max(0, buildLimit - aiBuilds),
  }
}

/**
 * Claims one build against the month's quota.
 *
 * The increment and the limit check happen in a single statement, so two
 * requests racing cannot both slip past the last remaining build. The `WHERE`
 * on the upsert is what enforces it: if the org is already at its limit the
 * update matches nothing and no row comes back.
 */
export async function claimBuild(orgId: string): Promise<{ ok: true } | { ok: false, limit: number, used: number }> {
  const period = currentPeriod()
  const limit = buildLimitFor(await planFor(orgId))

  const rows = await useDb()
    .insert(usageCounters)
    .values({ orgId, periodStart: period, aiBuilds: 1 })
    .onConflictDoUpdate({
      target: [usageCounters.orgId, usageCounters.periodStart],
      set: { aiBuilds: sql`${usageCounters.aiBuilds} + 1`, updatedAt: new Date() },
      where: sql`${usageCounters.aiBuilds} < ${limit}`,
    })
    .returning({ aiBuilds: usageCounters.aiBuilds })

  if (!rows.length) {
    const current = await usageFor(orgId)
    return { ok: false, limit, used: current.aiBuilds }
  }
  return { ok: true }
}

/**
 * Records what a finished build actually cost.
 *
 * Separate from `claimBuild` because token counts are only known after the
 * model has run, while the quota has to be claimed before it starts.
 */
export async function recordUsage(orgId: string, usage: BuildUsage): Promise<void> {
  const period = currentPeriod()

  await useDb()
    .insert(usageCounters)
    .values({
      orgId,
      periodStart: period,
      aiBuilds: 0,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheReadTokens: usage.cacheReadTokens,
    })
    .onConflictDoUpdate({
      target: [usageCounters.orgId, usageCounters.periodStart],
      set: {
        inputTokens: sql`${usageCounters.inputTokens} + ${usage.inputTokens}`,
        outputTokens: sql`${usageCounters.outputTokens} + ${usage.outputTokens}`,
        cacheReadTokens: sql`${usageCounters.cacheReadTokens} + ${usage.cacheReadTokens}`,
        updatedAt: new Date(),
      },
    })
}

/** Returns a claimed build to the pool when the turn failed before spending. */
export async function releaseBuild(orgId: string): Promise<void> {
  const period = currentPeriod()
  await useDb().update(usageCounters)
    .set({ aiBuilds: sql`GREATEST(0, ${usageCounters.aiBuilds} - 1)` })
    .where(and(eq(usageCounters.orgId, orgId), eq(usageCounters.periodStart, period)))
}
