import './App.css'
import { AuthSplashScreen } from './features/auth/components/AuthSplashScreen'
import { AuthProvider } from './features/auth/context/AuthProvider'
import { useAuth } from './features/auth/hooks/useAuth'
import { ProvisioningWorkspace } from './features/registry/components/ProvisioningWorkspace'

interface AppProps {
  initialDemoSession?: boolean
}

function AuthenticatedGate() {
  const { session } = useAuth()

  if (!session) {
    return <AuthSplashScreen />
  }

  return <ProvisioningWorkspace />
}

export function App({ initialDemoSession = false }: AppProps) {
  return (
    <AuthProvider initialDemoSession={initialDemoSession}>
      <AuthenticatedGate />
    </AuthProvider>
  )
}

export default App
