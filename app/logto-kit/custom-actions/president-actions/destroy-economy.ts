'use server';

export async function getDestroyEconomy() {
  return {
    requiredPerm: 'steal:taxes',
    handler: async ({ payload }: { userId: string; orgId: string; payload: unknown }) => {
      const currentInflation = (payload as { inflation?: number })?.inflation ?? 0;
      const newInflation = currentInflation + 10;

      console.log(`💸 The dollar is worth ${newInflation}% less now!!`);

      return {
        success: true,
        message: `Inflated the economy! Dollar worth ${newInflation}% less.`,
        data: { inflation: newInflation }
      };
    },
  };
}