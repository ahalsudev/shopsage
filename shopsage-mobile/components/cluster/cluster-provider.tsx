import { createContext, ReactNode, useContext, useMemo, useState } from 'react'
import { Cluster } from '@/components/cluster/cluster'
import { ClusterNetwork } from '@/components/cluster/cluster-network'
import { RPC_ENDPOINTS } from '@/constants/programs'

export interface ClusterProviderContext {
  selectedCluster: Cluster
  clusters: Cluster[]
  setSelectedCluster: (cluster: Cluster) => void

  getExplorerUrl(path: string): string
}

const Context = createContext<ClusterProviderContext>({} as ClusterProviderContext)

const clusters: Cluster[] = [
  {
    id: 'solana:devnet',
    name: 'Devnet',
    endpoint: RPC_ENDPOINTS.devnet,
    network: ClusterNetwork.Devnet,
  },
  {
    id: 'solana:testnet',
    name: 'Testnet',
    endpoint: RPC_ENDPOINTS.testnet,
    network: ClusterNetwork.Testnet,
  },
]

export function ClusterProvider({ children }: { children: ReactNode }) {
  const [selectedCluster, setSelectedCluster] = useState<Cluster>(clusters[0])
  const value: ClusterProviderContext = useMemo(
    () => ({
      selectedCluster,
      clusters: [...clusters].sort((a, b) => (a.name > b.name ? 1 : -1)),
      setSelectedCluster: (cluster: Cluster) => setSelectedCluster(cluster),
      getExplorerUrl: (path: string) => `https://explorer.solana.com/${path}${getClusterUrlParam(selectedCluster)}`,
    }),
    [selectedCluster, setSelectedCluster],
  )
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useCluster() {
  return useContext(Context)
}

function getClusterUrlParam(cluster: Cluster): string {
  let suffix = ''
  switch (cluster.network) {
    case ClusterNetwork.Devnet:
      suffix = 'devnet'
      break
    case ClusterNetwork.Mainnet:
      suffix = ''
      break
    case ClusterNetwork.Testnet:
      suffix = 'testnet'
      break
    default:
      suffix = `custom&customUrl=${encodeURIComponent(cluster.endpoint)}`
      break
  }

  return suffix.length ? `?cluster=${suffix}` : ''
}
