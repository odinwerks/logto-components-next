'use server';

export async function getBasicCalc() {
  return {
    requiredPerm: 'calc:basic',
    handler: async ({ payload }: { userId: string; orgId: string; payload: unknown }) => {
      const { expression, result } = payload as { expression: string; result: number };
      return {
        success: true,
        message: `${expression} = ${result}`,
        data: { expression, result }
      };
    },
  };
}
