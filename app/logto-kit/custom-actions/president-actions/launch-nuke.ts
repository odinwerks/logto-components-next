'use server';

const COUNTRIES = [
  'Russia', 'China', 'Iran', 'North Korea', 'Norway', 'France', 
  'UK', 'Germany', 'Japan', 'Brazil', 'India', 'Australia', 
  'Canada', 'Mexico', 'Egypt', 'Spain', 'Italy'
];

export async function getLaunchNuke() {
  return {
    requiredPerm: 'launch:nuke',
    handler: async ({ payload }: { userId: string; orgId: string; payload: unknown }) => {
      const currentLaunches = (payload as { launches?: number })?.launches ?? 0;
      const newLaunchCount = currentLaunches + 1;
      const targetCountry = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];

      console.log(`🚀 Nuke launched at ${targetCountry}! ☢️ (Total launches: ${newLaunchCount})`);

      return {
        success: true,
        message: `Nuke launched at ${targetCountry}!`,
        data: { launched: true, target: targetCountry, launches: newLaunchCount }
      };
    },
  };
}