import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  Lock,
  UserRound,
  Quote,
  BookOpen,
} from 'lucide-react'
import { toast } from 'sonner'
import { csrf, mutate, errorMessage, get } from '../lib/api'
import { Logo, Cover } from '../components/common'
import { Button } from '../components/ui/button'
type Mode = 'login' | 'register' | 'forgot' | 'reset'
const schema = (mode: Mode) =>
  z
    .object({
      email: z.email('Email không hợp lệ'),
      password:
        mode === 'forgot'
          ? z.string().optional()
          : z.string().min(mode === 'login' ? 1 : 8, 'Mật khẩu cần ít nhất 8 ký tự'),
      name: mode === 'register' ? z.string().min(2, 'Nhập họ và tên') : z.string().optional(),
      password_confirmation: z.string().optional(),
      remember: z.boolean().optional(),
    })
    .refine(
      (d) => !['register', 'reset'].includes(mode) || d.password === d.password_confirmation,
      { message: 'Mật khẩu xác nhận chưa khớp', path: ['password_confirmation'] },
    )
export function AuthForm({ mode, onSuccess }: { mode: Mode; onSuccess?: () => void }) {
  const [show, setShow] = useState(false)
  const [serverError, setServerError] = useState('')
  const client = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema(mode)),
    defaultValues: {
      email: params.get('email') || '',
      name: '',
      password: '',
      password_confirmation: '',
      remember: true,
    },
  })
  const submit = handleSubmit(async (data) => {
    setServerError('')
    try {
      await csrf()
      const endpoint = {
        login: 'login',
        register: 'register',
        forgot: 'forgot-password',
        reset: 'reset-password',
      }[mode]
      const r = await mutate('/auth/' + endpoint, { ...data, token: params.get('token') })
      if (mode === 'forgot' || mode === 'reset') {
        toast.success(r.message)
        if (mode === 'reset') navigate('/login')
        return
      }
      client.setQueryData(['me'], r.data)
      client.invalidateQueries()
      toast.success('Chào mừng ' + r.data.name + '!')
      if (onSuccess) onSuccess()
      else
        navigate(
          location.state?.from ||
            (r.data.permissions.includes('dashboard.view') ? '/admin' : '/reader'),
          { replace: true },
        )
    } catch (e) {
      setServerError(errorMessage(e))
    }
  })
  return (
    <form onSubmit={submit} className="auth-form" noValidate>
      {mode === 'register' && (
        <label>
          Họ và tên
          <div className="input-icon">
            <UserRound size={17} />
            <input autoComplete="name" placeholder="Nguyễn Minh An" {...register('name')} />
          </div>
          {errors.name && <small className="field-error">{errors.name.message}</small>}
        </label>
      )}
      <label>
        Địa chỉ email
        <div className="input-icon">
          <Mail size={17} />
          <input
            type="email"
            autoComplete="email"
            placeholder="ban@example.com"
            {...register('email')}
          />
        </div>
        {errors.email && <small className="field-error">{errors.email.message}</small>}
      </label>
      {mode !== 'forgot' && (
        <label>
          Mật khẩu
          <div className="input-icon">
            <Lock size={17} />
            <input
              type={show ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder={
                mode === 'login' ? 'Nhập mật khẩu của bạn' : 'Ít nhất 8 ký tự, gồm chữ và số'
              }
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {errors.password && <small className="field-error">{errors.password.message}</small>}
        </label>
      )}
      {['register', 'reset'].includes(mode) && (
        <label>
          Xác nhận mật khẩu
          <div className="input-icon">
            <Lock size={17} />
            <input
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu"
              {...register('password_confirmation')}
            />
          </div>
          {errors.password_confirmation && (
            <small className="field-error">{errors.password_confirmation.message}</small>
          )}
        </label>
      )}
      {mode === 'login' && (
        <div className="form-options">
          <label className="checkbox">
            <input type="checkbox" {...register('remember')} />
            Ghi nhớ đăng nhập
          </label>
          <Link to="/forgot-password">Quên mật khẩu?</Link>
        </div>
      )}
      {serverError && (
        <div role="alert" className="form-error">
          {serverError}
        </div>
      )}
      <Button className="full-width" disabled={isSubmitting}>
        {isSubmitting ? (
          <span className="spinner small" />
        ) : (
          <>
            {
              {
                login: 'Đăng nhập',
                register: 'Tạo tài khoản',
                forgot: 'Gửi liên kết đặt lại',
                reset: 'Đặt lại mật khẩu',
              }[mode]
            }
            <ArrowRight size={17} />
          </>
        )}
      </Button>
      {mode === 'register' && (
        <p className="fine-print">
          Bằng việc đăng ký, bạn đồng ý tuân thủ chính sách mượn và giữ gìn sách của thư viện.
        </p>
      )}
    </form>
  )
}
export default function AuthPage({ mode = 'login' }: { mode?: Mode }) {
  const { data } = useQuery({
    queryKey: ['hero-books'],
    queryFn: () => get('/books', { featured: true, per_page: 12, sort: 'popular' }),
  })
  return (
    <div className="auth-page">
      <div className="auth-visual">
        <Logo />
        <div className="auth-art">
          {data?.data
            ?.filter((b: any) => b.cover)
            .slice(0, 3)
            .map((b: any, i: number) => (
              <div className={'auth-book auth-book-' + i} key={b.id}>
                <Cover book={b} priority />
              </div>
            ))}
          <span className="auth-orbit" />
        </div>
        <div className="auth-quote">
          <Quote size={29} />
          <h2>
            Mỗi trang sách,
            <br />
            một chân trời mới.
          </h2>
          <p>
            Một không gian cho những tâm hồn tò mò.
            <br />
            Một thư viện cho hành trình của riêng bạn.
          </p>
          <span>
            <BookOpen size={16} /> THE WORLD IS YOUR LIBRARY
          </span>
        </div>
      </div>
      <main className="auth-main">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} />
          Trở về thư viện
        </Link>
        <div className="auth-content">
          <span className="eyebrow">YOUR NEXT CHAPTER</span>
          <h1>
            {
              {
                login: 'Chào mừng trở lại.',
                register: 'Hành trình bắt đầu.',
                forgot: 'Quên mật khẩu?',
                reset: 'Một khởi đầu mới.',
              }[mode]
            }
          </h1>
          <p>
            {
              {
                login: 'Đăng nhập và tiếp tục hành trình tri thức của bạn.',
                register: 'Trở thành thành viên của cộng đồng yêu sách LIBRIVO.',
                forgot: 'Nhập email để nhận hướng dẫn khôi phục tài khoản.',
                reset: 'Chọn mật khẩu mới để bảo vệ tài khoản của bạn.',
              }[mode]
            }
          </p>
          <AuthForm mode={mode} />
          <p className="form-footer">
            {mode === 'login' ? (
              <>
                Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
              </>
            ) : (
              <>
                Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
              </>
            )}
          </p>
        </div>
        <small className="auth-copyright">
          © {new Date().getFullYear()} LIBRIVO. Một thế giới trong từng trang sách.
        </small>
      </main>
    </div>
  )
}
