import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PropsWithChildren } from 'react'
import { Provider as ReduxProvider } from 'react-redux'
import { store } from '@/store'
import { ClusterProvider } from './cluster/cluster-provider'
import { SolanaProvider } from '@/components/solana/solana-provider'
import { AppTheme } from '@/components/app-theme'
import { AuthProvider } from '@/components/auth/auth-provider'

const queryClient = new QueryClient()

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ReduxProvider store={store}>
      <AppTheme>
        <QueryClientProvider client={queryClient}>
          <ClusterProvider>
            <SolanaProvider>
              <AuthProvider>{children}</AuthProvider>
            </SolanaProvider>
          </ClusterProvider>
        </QueryClientProvider>
      </AppTheme>
    </ReduxProvider>
  )
}
