'use server';

interface ProtectedActionHandler<T = unknown> {
  (data: { userId: string; orgId: string; payload: T }): Promise<T>;
}

interface ActionConfig<T = unknown> {
  requiredPermission: string;
  handler: ProtectedActionHandler<T>;
}

type ActionRegistry = Record<string, ActionConfig>;

const actions: ActionRegistry = {
  'explode-earth': {
    requiredPermission: 'launch-nuke',
    handler: async ({ payload }) => {
      console.log('[DEMO] Exploding earth with payload:', payload);
      return { success: true, message: 'Earth exploded (demo only!)' };
    },
  },
  'land-on-moon': {
    requiredPermission: 'land-on-moon',
    handler: async ({ payload }) => {
      console.log('[DEMO] Landing on moon with payload:', payload);
      return { success: true, message: 'Landed on moon (demo only!)' };
    },
  },
  'send-notification': {
    requiredPermission: 'send-notifications',
    handler: async ({ payload }) => {
      console.log('[DEMO] Sending notification with payload:', payload);
      return { success: true, message: 'Notification sent (demo only!)' };
    },
  },
};

export async function getAction(actionName: string): Promise<ActionConfig | undefined> {
  return actions[actionName];
}
