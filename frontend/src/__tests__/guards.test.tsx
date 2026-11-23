import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, Guard } from '../app/auth'
const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('../lib/api', () => ({
  get: mocks.get,
  api: { interceptors: { response: { use: vi.fn(), eject: vi.fn() } } },
  csrf: vi.fn(),
  mutate: vi.fn(),
  errorMessage: () => 'Network error',
}))
function route() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <AuthProvider>
          <Routes>
            <Route
              path="/admin"
              element={
                <Guard permission="dashboard.view">
                  <div>Private dashboard</div>
                </Guard>
              }
            />
            <Route path="/login" element={<div>Login screen</div>} />
            <Route path="/403" element={<div>Permission denied</div>} />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}
beforeEach(() => {
  mocks.get.mockReset()
})
describe('Route guards', () => {
  it('shows session loading while identity is unresolved', () => {
    mocks.get.mockReturnValue(new Promise(() => {}))
    route()
    expect(screen.getByText('Đang kết nối thư viện…')).toBeInTheDocument()
    expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument()
  })
  it('redirects unauthenticated users to login', async () => {
    mocks.get.mockRejectedValue({ response: { status: 401 } })
    route()
    expect(await screen.findByText('Login screen')).toBeInTheDocument()
  })
  it('refuses readers access to the admin dashboard', async () => {
    mocks.get.mockResolvedValue({
      data: { id: 3, name: 'Reader', permissions: ['books.view'], roles: ['Reader'] },
    })
    route()
    expect(await screen.findByText('Permission denied')).toBeInTheDocument()
  })
  it('allows users with the required permission', async () => {
    mocks.get.mockResolvedValue({
      data: { id: 1, name: 'Admin', permissions: ['dashboard.view'], roles: ['Super Admin'] },
    })
    route()
    expect(await screen.findByText('Private dashboard')).toBeInTheDocument()
  })
})
