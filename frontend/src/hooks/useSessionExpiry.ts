import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
export function useSessionExpiry() {
  const client = useQueryClient()
  useEffect(() => {
    const id = api.interceptors.response.use(
      (r) => r,
      (e) => {
        if (
          e.response?.status === 401 &&
          !e.config?.url?.includes('/auth/login') &&
          !e.config?.url?.endsWith('/me')
        ) {
          client.setQueryData(['me'], null)
          e.response.data.message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        }
        return Promise.reject(e)
      },
    )
    return () => api.interceptors.response.eject(id)
  }, [client])
}
