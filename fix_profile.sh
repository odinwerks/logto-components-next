#!/bin/bash
sed -i 's/<<<<<<< HEAD//g' app/logto-kit/components/dashboard/tabs/profile.tsx
sed -i '/=======/,/>>>>>>> bugfix\/audit-patches/d' app/logto-kit/components/dashboard/tabs/profile.tsx
