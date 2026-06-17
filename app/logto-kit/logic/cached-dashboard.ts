import 'server-only';

import { cache } from 'react';
import { fetchDashboardData } from './actions/dashboard';

export const fetchDashboardDataCached = cache(fetchDashboardData);
