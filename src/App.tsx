import React from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from './lib/hooks/useAuth'
import LoginScreen from './screens/Login'
import MainScreen from './screens/Main'
import UpdateNotification from './components/UpdateNotification'

export default function App() {
  const { session, student, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div style={styles.splash} className="titlebar-drag">
        <img src="./logo-light.png" alt="GoxLearning" style={styles.logo} />
        <Loader2 size={20} style={styles.spinner} className="animate-spin" />
      </div>
    )
  }

  if (!session || !student) {
    return <LoginScreen />
  }

  return (
    <>
      <MainScreen student={student} onSignOut={signOut} />
      <UpdateNotification />
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  splash: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    height: '100vh',
    background: 'var(--bg-card)',
  },
  logo: {
    height: 32,
    objectFit: 'contain' as any,
  },
  spinner: {
    color: 'var(--brand)',
  },
}
