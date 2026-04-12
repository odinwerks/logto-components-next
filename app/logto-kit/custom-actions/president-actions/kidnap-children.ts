'use server';

export async function getKidnapChildren() {
  return {
    requiredPerm: 'kidnap:kids',
    handler: async ({ payload }: { userId: string; orgId: string; payload: unknown }) => {
      const currentCount = (payload as { children?: number })?.children ?? 0;
      const newCount = currentCount + 1;

      console.log(`😈 Nice, kidnapped 1 more kid. My giant villa basement now has ${newCount} children.`);

      return {
        success: true,
        message: `Kidnapped another child! Basement count: ${newCount}`,
        data: { children: newCount }
      };
    },
  };
}