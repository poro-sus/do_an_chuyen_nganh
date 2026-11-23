import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthForm } from '../pages/Auth'
import { ErrorState, Empty, Cover } from '../components/common'
const mocks = vi.hoisted(() => ({ csrf: vi.fn(), mutate: vi.fn(), get: vi.fn() }))
vi.mock('../lib/api', () => ({
  ...mocks,
  errorMessage: () => 'Email hoặc mật khẩu không chính xác.',
}))
function wrap(ui: React.ReactNode) {
  return render(
    <MemoryRouter>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        {ui}
      </QueryClientProvider>
    </MemoryRouter>,
  )
}
describe('Authentication form validation and failures', () => {
  it('rejects invalid email without sending API request', async () => {
    wrap(<AuthForm mode="login" />)
    fireEvent.change(screen.getByLabelText('Địa chỉ email'), { target: { value: 'invalid' } })
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(await screen.findByText('Email không hợp lệ')).toBeInTheDocument()
    expect(mocks.mutate).not.toHaveBeenCalled()
  })
  it('requires matching passwords at registration', async () => {
    wrap(<AuthForm mode="register" />)
    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Minh An' } })
    fireEvent.change(screen.getByLabelText('Địa chỉ email'), {
      target: { value: 'an@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Mật khẩu', { exact: true }), {
      target: { value: 'Password123' },
    })
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu'), {
      target: { value: 'Mismatch123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))
    expect(await screen.findByText('Mật khẩu xác nhận chưa khớp')).toBeInTheDocument()
  })
  it('shows server failure and restores submit state', async () => {
    mocks.mutate.mockRejectedValueOnce(new Error('Unauthenticated'))
    wrap(<AuthForm mode="login" />)
    fireEvent.change(screen.getByLabelText('Địa chỉ email'), {
      target: { value: 'an@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Mật khẩu', { exact: true }), {
      target: { value: 'wrong' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email hoặc mật khẩu không chính xác.',
    )
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled())
  })
})
describe('Useful empty and error states', () => {
  it('offers retry when data cannot load', () => {
    const retry = vi.fn()
    wrap(<ErrorState retry={retry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(retry).toHaveBeenCalledOnce()
  })
  it('renders a meaningful empty state and action', () => {
    wrap(<Empty title="Tủ sách trống" action={<button>Khám phá sách</button>} />)
    expect(screen.getByText('Tủ sách trống')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Khám phá sách' })).toBeInTheDocument()
  })
  it('falls back to a designed cover when image fails', () => {
    const { container } = wrap(
      <Cover
        book={{
          id: 1,
          title: 'Clean Code',
          authors: [{ id: 1, name: 'Robert C. Martin' }],
          cover: '/invalid.jpg',
        }}
      />,
    )
    fireEvent.error(screen.getByRole('img'))
    expect(container.querySelector('.cover-fallback')).toHaveTextContent('Clean Code')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
