import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  candidates: defineTable({
    teamName: v.string(),
    segment: v.union(v.literal("cost_inefficiency"), v.literal("concurrency_ceiling")),
    tier: v.union(v.literal("low_touch"), v.literal("high_touch")),
    plan: v.string(),
    memberCount: v.number(),
    functionCallsMonthly: v.number(),
    currentMonthlyCost: v.number(),
    nextTierCost: v.number(),
    peakConcurrent: v.number(),
    concurrencyLimit: v.number(),
    signal: v.string(),
    contacted: v.boolean(),
  }),
});