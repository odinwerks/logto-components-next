'use server';

export async function getScientificCalc() {
  return {
    requiredPerm: 'calc:scientific',
    handler: async ({ payload }: { userId: string; orgId: string; payload: unknown }) => {
      if (typeof payload !== 'object' || payload === null) throw new Error('INVALID_PAYLOAD');
      const p = payload as Record<string, unknown>;
      if (typeof p.expression !== 'string' || typeof p.result !== 'number') throw new Error('INVALID_PAYLOAD');
      const { expression, result } = p as { expression: string; result: number };
      return {
        success: true,
        message: `${expression} = ${result}`,
        data: { expression, result }
      };
    },
  };
}
