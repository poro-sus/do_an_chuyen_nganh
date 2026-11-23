import { createContext, useContext, useState, lazy, Suspense, type ReactNode } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Navigate, useLocation, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { get, mutate, csrf, errorMessage } from '../lib/api'
import type { User } from '../types'
import { Modal } from '../components/ui/dialog'
import { useSessionExpiry } from '../hooks/useSessionExpiry'
const AuthForm = lazy(() => import('../pages/Auth').then((m) => ({ default: m.AuthForm })))
type AuthContextValue = {
  user: User | null
  loading: boolean
  can: (permission: string) => boolean
  requestLogin: () => void
  logout: () => void
}
const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  can: () => false,
  requestLogin: () => {},
  logout: () => {},
})
export function AuthProvider({ children }: { children: ReactNode }) {
  useSessionExpiry()
  const client = useQueryClient()
  const [login, setLogin] = useState(false)
  const query = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return (await get<{ data: User }>('/me')).data
      } catch (e: any) {
        if (e.response?.status === 401 || e.response?.status === 403) return null
        throw e
      }
    },
    retry: false,
    staleTime: 60000,
  })
  const logout = async () => {
    try {
      await mutate('/auth/logout')
      client.clear()
      client.setQueryData(['me'], null)
      toast.success('Đã đăng xuất')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  return (
    <AuthContext.Provider
      value={{
        user: query.data || null,
        loading: query.isPending,
        can: (p) => !!query.data?.permissions.includes(p),
        requestLogin: () => setLogin(true),
        logout,
      }}
    >
      {children}
      <Modal
        open={login}
        onClose={() => setLogin(false)}
        title="Chào mừng trở lại"
        description="Đăng nhập để lưu sách và bắt đầu hành trình đọc."
      >
        <Suspense fallback={<p>Đang mở form đăng nhập…</p>}>
          <AuthForm mode="login" onSuccess={() => setLogin(false)} />
        </Suspense>
        <p className="form-footer">
          Chưa có tài khoản?{' '}
          <Link to="/register" onClick={() => setLogin(false)}>
            Đăng ký thành viên
          </Link>
        </p>
      </Modal>
    </AuthContext.Provider>
  )
}
export const useAuth = () => useContext(AuthContext)
export function Guard({ children, permission }: { children: ReactNode; permission?: string }) {
  const { user, loading, can } = useAuth()
  const location = useLocation()
  if (loading)
    return (
      <div className="page-loading">
        <div className="spinner" />
        Đang kết nối thư viện…
      </div>
    )
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (permission && !can(permission)) return <Navigate to="/403" replace />
  return children
}
export function useTask() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({
      url,
      data,
      method = 'post',
    }: {
      url: string
      data?: unknown
      method?: 'post' | 'put' | 'delete'
    }) => {
      await csrf()
      return mutate(url, data, method)
    },
    onSuccess: () => {
      client.invalidateQueries()
      toast.success('Đã cập nhật thành công')
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
}
