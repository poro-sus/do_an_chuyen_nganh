import axios from 'axios'
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json' },
})
export const get = async <T = any>(url: string, params?: Record<string, unknown>): Promise<T> =>
  (await api.get('/api' + url, { params })).data
export async function mutate(
  url: string,
  data?: unknown,
  method: 'post' | 'put' | 'delete' = 'post',
) {
  return (await api.request({ url: '/api' + url, method, data })).data
}
export function errorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data
    return (
      Object.values(d?.errors || {})
        .flat()
        .join(' ') ||
      d?.message ||
      'Không thể kết nối máy chủ. Vui lòng thử lại.'
    )
  }
  return 'Có lỗi xảy ra. Vui lòng thử lại.'
}
export async function csrf() {
  await api.get('/sanctum/csrf-cookie')
}
