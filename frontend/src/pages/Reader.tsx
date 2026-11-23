import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  ArrowUpRight,
  UserRound,
  Lock,
  Star,
  Trash2,
  BookOpen,
} from 'lucide-react'
import { get } from '../lib/api'
import { useAuth, useTask } from '../app/auth'
import { PageHeading, Skeleton, ErrorState, Empty, Pagination, Cover } from '../components/common'
import { Button } from '../components/ui/button'
import { Modal } from '../components/ui/dialog'
import { date } from '../lib/utils'
export function Notifications() {
  const [page, setPage] = useState(1)
  const task = useTask()
  const q = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => get('/notifications', { page }),
  })
  return (
    <>
      <PageHeading
        eyebrow="NHỮNG LỜI NHẮN TỪ THƯ VIỆN"
        title="Bạn có thư."
        description="Cập nhật lượt mượn, ngày hẹn và những cuốn sách đang chờ bạn."
        actions={
          <Button
            variant="outline"
            disabled={task.isPending}
            onClick={() => task.mutate({ url: '/notifications/all/read', method: 'put' })}
          >
            <CheckCheck size={16} />
            Đánh dấu tất cả đã đọc
          </Button>
        }
      />
      <section className="panel">
        {q.isPending ? (
          <Skeleton />
        ) : q.isError ? (
          <ErrorState retry={() => q.refetch()} />
        ) : !q.data?.data.length ? (
          <Empty title="Hộp thư đang yên tĩnh" description="Thông báo mới sẽ xuất hiện tại đây." />
        ) : (
          <>
            <div className="notification-list">
              {q.data.data.map((n: any) => (
                <div className={'notification-row ' + (!n.read_at ? 'unread' : '')} key={n.id}>
                  <span className="notification-row-icon">
                    <Bell size={20} />
                  </span>
                  <div>
                    <strong>
                      {n.data.title}
                      {!n.read_at && <i />}
                    </strong>
                    <p>{n.data.message}</p>
                    <small>{date(n.created_at)}</small>
                  </div>
                  <div className="notification-actions">
                    {!n.read_at && (
                      <button
                        className="small-link"
                        disabled={task.isPending}
                        onClick={() =>
                          task.mutate({ url: '/notifications/' + n.id + '/read', method: 'put' })
                        }
                      >
                        Đã đọc
                        <CheckCheck size={14} />
                      </button>
                    )}
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={n.data.url} aria-label="Xem chi tiết thông báo">
                        <ArrowUpRight size={18} />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              page={q.data.meta.current_page}
              last={q.data.meta.last_page}
              total={q.data.meta.total}
              onChange={setPage}
            />
          </>
        )}
      </section>
    </>
  )
}
export function Profile() {
  const { user } = useAuth()
  const task = useTask()
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [avatar, setAvatar] = useState<File>()
  const [password, setPassword] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  })
  const [error, setError] = useState('')
  return (
    <>
      <PageHeading
        eyebrow="GÓC NHỎ CỦA RIÊNG BẠN"
        title="Hồ sơ cá nhân"
        description="Giữ thông tin liên hệ luôn mới để thư viện có thể kết nối với bạn."
      />
      <div className="profile-grid">
        <section className="panel profile-card">
          <span className="profile-avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} />
            ) : (
              user?.name.split(' ').slice(-1)[0][0]
            )}
          </span>
          <h2>{user?.name}</h2>
          <span className="category-tag">{user?.roles[0]}</span>
          <dl>
            <div>
              <dt>Mã thành viên</dt>
              <dd>{user?.member_code}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user?.email}</dd>
            </div>
          </dl>
          <p>
            Một thế giới tri thức.
            <br />
            Một hành trình của riêng bạn.
          </p>
          <BookOpen size={32} strokeWidth={1} />
        </section>
        <div className="profile-forms">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3>Thông tin của bạn</h3>
                <p>Hiển thị trên hồ sơ thành viên thư viện</p>
              </div>
              <UserRound size={19} />
            </div>
            <form
              className="panel-form stack-form"
              onSubmit={(e) => {
                e.preventDefault()
                const f = new FormData()
                f.append('name', name)
                f.append('phone', phone)
                if (avatar) f.append('avatar', avatar)
                task.mutate(
                  { url: '/me/profile', data: f },
                  { onSuccess: () => setAvatar(undefined) },
                )
              }}
            >
              <div className="form-grid">
                <label className="form-label">
                  Họ và tên
                  <input
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="form-label">
                  Điện thoại
                  <input maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </label>
                <label className="form-label span-2">
                  Ảnh đại diện
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setAvatar(e.target.files?.[0])}
                  />
                  <small>JPG, PNG, WebP · Tối đa 2MB</small>
                </label>
              </div>
              <div className="form-submit">
                <Button disabled={task.isPending}>Lưu hồ sơ</Button>
              </div>
            </form>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3>Bảo vệ tài khoản</h3>
                <p>Sử dụng mật khẩu đủ mạnh và giữ bí mật.</p>
              </div>
              <Lock size={19} />
            </div>
            <form
              className="panel-form stack-form"
              onSubmit={(e) => {
                e.preventDefault()
                if (password.password !== password.password_confirmation) {
                  setError('Mật khẩu xác nhận chưa khớp.')
                  return
                }
                setError('')
                task.mutate(
                  { url: '/me/password', method: 'put', data: password },
                  {
                    onSuccess: () =>
                      setPassword({
                        current_password: '',
                        password: '',
                        password_confirmation: '',
                      }),
                  },
                )
              }}
            >
              <label className="form-label">
                Mật khẩu hiện tại
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={password.current_password}
                  onChange={(e) => setPassword((p) => ({ ...p, current_password: e.target.value }))}
                />
              </label>
              <div className="form-grid">
                <label className="form-label">
                  Mật khẩu mới
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password.password}
                    onChange={(e) => setPassword((p) => ({ ...p, password: e.target.value }))}
                  />
                </label>
                <label className="form-label">
                  Xác nhận mật khẩu
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password.password_confirmation}
                    onChange={(e) =>
                      setPassword((p) => ({ ...p, password_confirmation: e.target.value }))
                    }
                  />
                </label>
              </div>
              {error && <p className="field-error">{error}</p>}
              <div className="form-submit">
                <Button disabled={task.isPending}>Đổi mật khẩu</Button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </>
  )
}
export function MyReviews() {
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<any>(null)
  const task = useTask()
  const q = useQuery({ queryKey: ['my-reviews', page], queryFn: () => get('/reviews', { page }) })
  return (
    <>
      <PageHeading
        eyebrow="GÓC NHÌN CỦA BẠN"
        title="Những điều ở lại sau trang cuối"
        description="Các đánh giá bạn đã chia sẻ sau những lượt mượn hoàn tất."
      />
      {q.isPending ? (
        <Skeleton />
      ) : q.isError ? (
        <ErrorState retry={() => q.refetch()} />
      ) : !q.data?.data.length ? (
        <section className="panel">
          <Empty
            title="Chưa có cảm nhận được chia sẻ"
            description="Sau khi trả sách, bạn có thể đánh giá trên trang chi tiết cuốn sách."
          />
        </section>
      ) : (
        <>
          <div className="my-reviews-grid">
            {q.data.data.map((r: any) => (
              <article className="panel my-review" key={r.id}>
                <div className="my-review-head">
                  <Cover book={r.book} />
                  <div>
                    <h3>{r.book?.title}</h3>
                    <div className="review-stars">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={14} fill={r.rating >= s ? 'currentColor' : 'none'} />
                      ))}
                    </div>
                    <small>{date(r.updated_at)}</small>
                  </div>
                </div>
                <p>{r.comment}</p>
                <div className="row-actions">
                  <Button asChild variant="outline" size="sm">
                    <Link to={'/books/' + r.book_id}>
                      Chỉnh sửa cảm nhận
                      <ArrowUpRight size={14} />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Xóa đánh giá"
                    onClick={() => setDeleting(r)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </article>
            ))}
          </div>
          <Pagination
            page={q.data.meta.current_page}
            last={q.data.meta.last_page}
            total={q.data.meta.total}
            onChange={setPage}
          />
        </>
      )}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Xóa đánh giá của bạn?"
        description="Cảm nhận này sẽ không còn hiển thị trên trang sách."
      >
        <div className="modal-actions">
          <Button variant="outline" onClick={() => setDeleting(null)}>
            Giữ lại
          </Button>
          <Button
            variant="destructive"
            disabled={task.isPending}
            onClick={() =>
              task.mutate(
                { url: '/reviews/' + deleting.id, method: 'delete' },
                { onSuccess: () => setDeleting(null) },
              )
            }
          >
            Xác nhận xóa
          </Button>
        </div>
      </Modal>
    </>
  )
}
