'use server';

interface ProtectedActionHandler<T = unknown> {
  (data: { userId: string; orgId: string; payload: T }): Promise<T>;
}

interface ActionConfig<T = unknown> {
  requiredPerm: string | string[]; // Changed from requiredRole
  handler: ProtectedActionHandler<T>;
}

type ActionRegistry = Record<string, ActionConfig>;

const actions: ActionRegistry = {
  'destroy-economy': {
    requiredPerm: 'steal:taxes', // Use actual permission from Logto Console
    handler: async ({ payload }) => {
      // Get current counter from payload or default to 0
      const currentInflation = (payload as { inflation?: number })?.inflation ?? 0;
      const newInflation = currentInflation + 10; // Increment by 10%

      console.log(`💸 The dollar is worth ${newInflation}% less now!!`);

      return {
        success: true,
        message: `Inflated the economy! Dollar worth ${newInflation}% less.`,
        data: { inflation: newInflation }
      };
    },
  },
  'steal-tax-dollars': {
    requiredPerm: 'steal:taxes', // Use actual permission from Logto Console
    handler: async ({ payload }) => {
      // Get current stolen amount from payload or default to 0
      const currentStolen = (payload as { stolen?: number })?.stolen ?? 0;
      const newStolen = currentStolen + 1000000; // Increment by $1M

      console.log(`💰 Stolen $1M. I now illegally have $${newStolen.toLocaleString()}.`);

      return {
        success: true,
        message: `Stole $1M from taxpayers! Total: $${newStolen.toLocaleString()}`,
        data: { stolen: newStolen }
      };
    },
  },
  'kidnap-children': {
    requiredPerm: 'kidnap:kids', // Use actual permission from Logto Console
    handler: async ({ payload }) => {
      // Get current count from payload or default to 0
      const currentCount = (payload as { children?: number })?.children ?? 0;
      const newCount = currentCount + 1;

      console.log(`😈 Nice, kidnapped 1 more kid. My giant villa basement now has ${newCount} children.`);

      return {
        success: true,
        message: `Kidnapped another child! Basement count: ${newCount}`,
        data: { children: newCount }
      };
    },
  },
};

export async function getAction(actionName: string): Promise<ActionConfig | undefined> {
  return actions[actionName];
}
