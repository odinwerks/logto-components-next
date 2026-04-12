'use server';

export async function getStealTaxDollars() {
  return {
    requiredPerm: 'steal:taxes',
    handler: async ({ payload }: { userId: string; orgId: string; payload: unknown }) => {
      const currentStolen = (payload as { stolen?: number })?.stolen ?? 0;
      const newStolen = currentStolen + 1000000;

      console.log(`💰 Stolen $1M. I now illegally have $${newStolen.toLocaleString()}.`);

      return {
        success: true,
        message: `Stole $1M from taxpayers! Total: $${newStolen.toLocaleString()}`,
        data: { stolen: newStolen }
      };
    },
  };
}