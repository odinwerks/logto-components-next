#!/bin/bash
# Recreate the mobile-client.tsx without the conflict markers, integrating the fix
sed -i 's/<<<<<<< HEAD//g' app/logto-kit/components/dashboard/mobile-client.tsx
sed -i '/=======/,/>>>>>>> bugfix\/audit-patches/d' app/logto-kit/components/dashboard/mobile-client.tsx
sed -i 's/duration={0.12}/duration={0.05}\n                  instant/g' app/logto-kit/components/dashboard/mobile-client.tsx
sed -i 's/resetKey={`${tabId}-${activeTab}`}/resetKey={`${tabId}-${isVisible ? '"'visible'"' : '"'hidden'"'}`}/g' app/logto-kit/components/dashboard/mobile-client.tsx
