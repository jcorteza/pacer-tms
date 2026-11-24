import { Navigate, Route, Routes } from 'react-router'
import { RequireAuth } from './auth/RequireAuth.tsx'
import { RequireRole } from './auth/RequireRole.tsx'
import { MANAGEMENT_ROLES } from './auth/roles.ts'
import { NAV_ITEMS } from './nav.ts'
import { ComingSoonPage } from './pages/ComingSoonPage.tsx'
import { ConfigurationPage } from './pages/ConfigurationPage.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { SettingsPage } from './pages/SettingsPage.tsx'
import { Shell } from './shell/Shell.tsx'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <Shell />
          </RequireAuth>
        }
      >
        {/* The app opens on whatever is first in the nav. */}
        <Route index element={<Navigate to={NAV_ITEMS[0].path} replace />} />
        <Route path="shipments" element={<ComingSoonPage title="Shipments" />} />
        <Route
          path="configuration"
          element={
            <RequireRole roles={MANAGEMENT_ROLES}>
              <ConfigurationPage />
            </RequireRole>
          }
        />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
