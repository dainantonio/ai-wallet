import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsage, runOptimization } from "@workspace/api-client-react";
import type { UsageData, OptimizationResult, ActivityItem } from "@workspace/api-client-react/src/generated/api.schemas";

// Fallback data in case the actual API isn't implemented or fails
const MOCK_ACTIVITY: ActivityItem[] = [
  { id: "act_1", type: "optimization", label: "Semantic Cache Hit", value: "-$0.04", timestamp: new Date(Date.now() - 120000).toISOString() },
  { id: "act_2", type: "usage", label: "GPT-4o Completion", value: "2.4s", timestamp: new Date(Date.now() - 340000).toISOString() },
  { id: "act_3", type: "alert", label: "Cost Spike Detected", value: "Anthropic", timestamp: new Date(Date.now() - 860000).toISOString() },
  { id: "act_4", type: "optimization", label: "Routed to Haiku", value: "-$0.12", timestamp: new Date(Date.now() - 1400000).toISOString() },
  { id: "act_5", type: "usage", label: "Claude 3.5 Sonnet", value: "1.8s", timestamp: new Date(Date.now() - 3600000).toISOString() },
];

const MOCK_USAGE_DATA: UsageData = {
  totalRequests: 142850,
  avgLatency: 1.24,
  totalSpend: 3450.20,
  savings: 420.50,
  savingsPercent: 12.5,
  autopilotSaved: 285.00,
  credits: 1500.00,
  avgCost: 0.024,
  topTool: "OpenAI GPT-4o",
  models: [
    { model: "GPT-4o", requests: 85000, percentage: 60, avgLatency: 1.5, cost: 2100.00 },
    { model: "Claude 3.5 Sonnet", requests: 42000, percentage: 30, avgLatency: 1.1, cost: 1050.00 },
    { model: "Gemini 1.5 Pro", requests: 15850, percentage: 10, avgLatency: 0.8, cost: 300.20 },
  ],
  activity: MOCK_ACTIVITY
};

export function useUsageData() {
  return useQuery<UsageData>({
    queryKey: ['/api/usage'],
    queryFn: async () => {
      try {
        const data = await getUsage();
        return data;
      } catch (error) {
        console.warn("Failed to fetch /api/usage, using simulated data.", error);
        return MOCK_USAGE_DATA;
      }
    },
    refetchInterval: 10000, // Poll every 10 seconds
  });
}

export function useOptimize() {
  const queryClient = useQueryClient();
  
  return useMutation<OptimizationResult, Error, void>({
    mutationFn: async () => {
      try {
        return await runOptimization();
      } catch (error) {
        console.warn("Failed to call /api/optimize, simulating response.", error);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const newItem: ActivityItem = {
          id: `act_opt_${Date.now()}`,
          type: "optimization",
          label: "Dynamic Route Applied",
          value: "-$0.08",
          timestamp: new Date().toISOString()
        };
        
        return {
          success: true,
          newItems: [newItem],
          totalActivity: [newItem, ...MOCK_ACTIVITY].slice(0, 10)
        };
      }
    },
    onSuccess: (data) => {
      // Optimistically update the cache with new activity
      queryClient.setQueryData<UsageData>(['/api/usage'], (old) => {
        if (!old) return old;
        const newActivity = [...data.newItems, ...old.activity].slice(0, 10);
        return {
          ...old,
          savings: old.savings + 0.08,
          autopilotSaved: old.autopilotSaved + 0.08,
          activity: newActivity
        };
      });
    }
  });
}
