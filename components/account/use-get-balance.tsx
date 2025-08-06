import { PublicKey } from '@solana/web3.js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { solanaUtils } from '@/utils/solana'

export function useGetBalanceQueryKey({ address }: { address: PublicKey }) {
  return ['get-balance', { address: address.toString() }]
}

export function useGetBalance({ address }: { address: PublicKey }) {
  const queryKey = useGetBalanceQueryKey({ address })

  return useQuery({
    queryKey,
    queryFn: () => solanaUtils.getAccountBalanceInLamports(address),
  })
}

export function useGetBalanceInvalidate({ address }: { address: PublicKey }) {
  const queryKey = useGetBalanceQueryKey({ address })
  const client = useQueryClient()

  return () => client.invalidateQueries({ queryKey })
}
