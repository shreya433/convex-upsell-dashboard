import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const CANDIDATE_DATA = [
  { teamName: "Frofont Works", segment: "cost_inefficiency", tier: "high_touch", plan: "Pro", memberCount: 2, functionCallsMonthly: 3068518841, currentMonthlyCost: 17334.86, nextTierCost: 2500, peakConcurrent: 3120.8, concurrencyLimit: 256, signal: "$17,335/mo overage vs $2,500 on next tier" },
  { teamName: "Calspire Digital", segment: "cost_inefficiency", tier: "high_touch", plan: "Pro", memberCount: 2, functionCallsMonthly: 2525467295, currentMonthlyCost: 14498.53, nextTierCost: 2500, peakConcurrent: 772.3, concurrencyLimit: 256, signal: "$14,499/mo overage vs $2,500 on next tier" },
  { teamName: "Bricliff", segment: "cost_inefficiency", tier: "high_touch", plan: "Pro", memberCount: 1, functionCallsMonthly: 2175188773, currentMonthlyCost: 9684.44, nextTierCost: 2500, peakConcurrent: 4140.0, concurrencyLimit: 256, signal: "$9,684/mo overage vs $2,500 on next tier" },
  { teamName: "Sarwick Health", segment: "cost_inefficiency", tier: "high_touch", plan: "Pro", memberCount: 5, functionCallsMonthly: 1338484004, currentMonthlyCost: 3343.43, nextTierCost: 2500, peakConcurrent: 2770.7, concurrencyLimit: 256, signal: "$3,343/mo overage vs $2,500 on next tier" },
  { teamName: "Mormoor Media", segment: "cost_inefficiency", tier: "high_touch", plan: "Pro", memberCount: 6, functionCallsMonthly: 1287372474, currentMonthlyCost: 3096.2, nextTierCost: 2500, peakConcurrent: 2029.9, concurrencyLimit: 256, signal: "$3,096/mo overage vs $2,500 on next tier" },
  { teamName: "Rivgate Logistics", segment: "cost_inefficiency", tier: "high_touch", plan: "Pro", memberCount: 5, functionCallsMonthly: 993522137, currentMonthlyCost: 3017.85, nextTierCost: 2500, peakConcurrent: 59.1, concurrencyLimit: 256, signal: "$3,018/mo overage vs $2,500 on next tier" },
  { teamName: "Oromoor", segment: "cost_inefficiency", tier: "high_touch", plan: "Pro", memberCount: 5, functionCallsMonthly: 930932523, currentMonthlyCost: 2785.25, nextTierCost: 2500, peakConcurrent: 188.3, concurrencyLimit: 256, signal: "$2,785/mo overage vs $2,500 on next tier" },
  { teamName: "Galgrove Logistics", segment: "cost_inefficiency", tier: "high_touch", plan: "Pro", memberCount: 4, functionCallsMonthly: 1092142142, currentMonthlyCost: 2646.2, nextTierCost: 2500, peakConcurrent: 1804.1, concurrencyLimit: 256, signal: "$2,646/mo overage vs $2,500 on next tier" },
  { teamName: "Rivfield Studio", segment: "cost_inefficiency", tier: "low_touch", plan: "Starter", memberCount: 1, functionCallsMonthly: 7067681, currentMonthlyCost: 320.08, nextTierCost: 25, peakConcurrent: 3.0, concurrencyLimit: 16, signal: "$320/mo overage vs $25 on next tier" },
  { teamName: "Torfield Systems", segment: "cost_inefficiency", tier: "low_touch", plan: "Starter", memberCount: 1, functionCallsMonthly: 15500614, currentMonthlyCost: 92.98, nextTierCost: 25, peakConcurrent: 82.5, concurrencyLimit: 16, signal: "$93/mo overage vs $25 on next tier" },
  { teamName: "Umbmere Labs", segment: "cost_inefficiency", tier: "low_touch", plan: "Starter", memberCount: 1, functionCallsMonthly: 38756835, currentMonthlyCost: 86.27, nextTierCost: 25, peakConcurrent: 0.3, concurrencyLimit: 16, signal: "$86/mo overage vs $25 on next tier" },
  { teamName: "Nyxport Systems", segment: "cost_inefficiency", tier: "low_touch", plan: "Starter", memberCount: 1, functionCallsMonthly: 14970786, currentMonthlyCost: 85.15, nextTierCost: 25, peakConcurrent: 108.8, concurrencyLimit: 16, signal: "$85/mo overage vs $25 on next tier" },
  { teamName: "Kesharbor Games", segment: "cost_inefficiency", tier: "low_touch", plan: "Starter", memberCount: 1, functionCallsMonthly: 16686563, currentMonthlyCost: 83.73, nextTierCost: 25, peakConcurrent: 169.6, concurrencyLimit: 16, signal: "$84/mo overage vs $25 on next tier" },
  { teamName: "Quoquay Media", segment: "cost_inefficiency", tier: "low_touch", plan: "Starter", memberCount: 2, functionCallsMonthly: 5943386, currentMonthlyCost: 62.2, nextTierCost: 50, peakConcurrent: 0.2, concurrencyLimit: 16, signal: "$62/mo overage vs $50 on next tier" },
  { teamName: "Froreach Commerce", segment: "cost_inefficiency", tier: "low_touch", plan: "Starter", memberCount: 1, functionCallsMonthly: 8614193, currentMonthlyCost: 58.66, nextTierCost: 25, peakConcurrent: 0.0, concurrencyLimit: 16, signal: "$59/mo overage vs $25 on next tier" },
  { teamName: "Melharbor Systems", segment: "cost_inefficiency", tier: "low_touch", plan: "Starter", memberCount: 1, functionCallsMonthly: 25272670, currentMonthlyCost: 53.65, nextTierCost: 25, peakConcurrent: 0.3, concurrencyLimit: 16, signal: "$54/mo overage vs $25 on next tier" },
  { teamName: "Pavshore Cloud", segment: "concurrency_ceiling", tier: "high_touch", plan: "Pro", memberCount: 2, functionCallsMonthly: 135767286, currentMonthlyCost: 0, nextTierCost: 0, peakConcurrent: 3783.3, concurrencyLimit: 256, signal: "14.8x over S256 concurrency limit" },
  { teamName: "Calhollow Studio", segment: "concurrency_ceiling", tier: "high_touch", plan: "Pro", memberCount: 4, functionCallsMonthly: 134333888, currentMonthlyCost: 0, nextTierCost: 0, peakConcurrent: 2409.4, concurrencyLimit: 256, signal: "9.4x over S256 concurrency limit" },
  { teamName: "Vershore Health", segment: "concurrency_ceiling", tier: "high_touch", plan: "Starter", memberCount: 3, functionCallsMonthly: 11411392, currentMonthlyCost: 0, nextTierCost: 0, peakConcurrent: 34.4, concurrencyLimit: 16, signal: "2.2x over S16 concurrency limit" },
] as const;

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("candidates").collect();
    for (const doc of existing) {
      await ctx.db.delete(doc._id);
    }
    for (const c of CANDIDATE_DATA) {
      await ctx.db.insert("candidates", { ...c, contacted: false });
    }
    return `Seeded ${CANDIDATE_DATA.length} candidates`;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("candidates").collect();
  },
});

export const markContacted = mutation({
  args: { id: v.id("candidates") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { contacted: true });
  },
});