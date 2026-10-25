import './App.css'
import { AuthProvider } from './features/auth/context/AuthProvider'
import { ProvisioningWorkspace } from './features/registry/components/ProvisioningWorkspace'

export function App() {
  return (
    <AuthProvider initialDemoSession={true}>
      <ProvisioningWorkspace />
    </AuthProvider>
  )
}

export default App
