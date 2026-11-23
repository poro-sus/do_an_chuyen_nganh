import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Download, Pencil, ArrowUpRight } from 'lucide-react'
import { get } from '../lib/api'
import { useAuth, useTask } from '../app/auth'
import {
  PageHeading,
  SearchInput,
  useDebounce,
  Skeleton,
  ErrorState,
  Empty,
  Pagination,
  Badge,
} from '../components/common'
import { Button } from '../components/ui/button'
import { Modal } from '../components/ui/dialog'
import { date, money } from '../lib/utils'
export default function Members() {
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search)
  const [locked, setLocked] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<any>(undefined)
  const [detail, setDetail] = useState<any>(null)
  const q = useQuery({
    queryKey: ['members', debounced, page, locked],
    queryFn: () => get('/members', { search: debounced, page, locked }),
  })
  const details = useQuery({
    queryKey: ['member-detail', detail?.id],
    queryFn: () => get('/members/' + detail.id),
    enabled: !!detail,
  })
  return (
    <>
      <PageHeading
        eyebrow="NHỮNG NGƯỜI BẠN CỦA THƯ VIỆN"
        title="Cộng đồng yêu sách"
        description="Chăm sóc thành viên, theo dõi hoạt động và quản lý tài khoản."
        actions={
          <>
            <Button variant="outline" asChild>
              <a href="/api/reports/export?type=members&format=xlsx">
                <Download size={16} />
                Xuất danh sách
              </a>
            </Button>
            <Button onClick={() => setSelected(null)}>
              <Plus size={17} />
              Thêm thành viên
            </Button>
          </>
        }
      />
      <section className="panel">
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={(s) => {
              setSearch(s)
              setPage(1)
            }}
            placeholder="Tên, email hoặc mã thành viên…"
          />
          <select
            value={locked}
            onChange={(e) => {
              setLocked(e.target.value)
              setPage(1)
            }}
            aria-label="Trạng thái tài khoản"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="0">Đang hoạt động</option>
            <option value="1">Đã khóa</option>
          </select>
        </div>
        {q.isPending ? (
          <Skeleton />
        ) : q.isError ? (
          <ErrorState retry={() => q.refetch()} />
        ) : !q.data?.data.length ? (
          <Empty title="Chưa tìm thấy thành viên" />
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Thành viên</th>
                    <th>Liên hệ</th>
                    <th>Vai trò</th>
                    <th>Hoạt động</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.data.map((u: any) => (
                    <tr key={u.id}>
                      <td>
                        <div className="table-person">
                          <span className="avatar">{u.name.split(' ').slice(-1)[0][0]}</span>
                          <div>
                            <strong>{u.name}</strong>
                            <small>{u.member_code}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {u.email}
                        <small className="cell-sub">
                          {u.phone || 'Chưa cập nhật số điện thoại'}
                        </small>
                      </td>
                      <td>
                        <span className="category-tag">{u.roles[0]}</span>
                      </td>
                      <td>
                        <strong>{u.active_count} đang mượn</strong>
                        <small className="cell-sub">
                          {u.loans_count} lượt · {u.overdue_count} quá hạn
                        </small>
                      </td>
                      <td>
                        <span
                          className={'status-dot ' + (u.locked ? 'danger-text' : 'success-text')}
                        >
                          <i />
                          {u.locked ? 'Đã khóa' : 'Hoạt động'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Xem hồ sơ"
                            aria-label={'Hồ sơ ' + u.name}
                            onClick={() => setDetail(u)}
                          >
                            <ArrowUpRight size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Chỉnh sửa"
                            aria-label={'Sửa ' + u.name}
                            onClick={() => setSelected(u)}
                          >
                            <Pencil size={15} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
      <Modal
        open={selected !== undefined}
        onClose={() => setSelected(undefined)}
        title={selected ? 'Cập nhật thành viên' : 'Chào đón thành viên mới'}
      >
        {selected !== undefined && (
          <MemberForm user={selected} onDone={() => setSelected(undefined)} />
        )}
      </Modal>
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.name || 'Hồ sơ thành viên'}
        description={detail?.member_code}
        wide
      >
        {details.isPending ? (
          <Skeleton />
        ) : details.isError ? (
          <ErrorState retry={() => details.refetch()} />
        ) : (
          <>
            <div className="member-detail-info">
              <span>{detail?.email}</span>
              <span>Tham gia {date(details.data?.data.user.created_at)}</span>
              <span>{details.data?.data.user.roles.join(', ')}</span>
            </div>
            <h3>Lịch sử mượn sách</h3>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Cuốn sách</th>
                    <th>Trạng thái</th>
                    <th>Hạn trả</th>
                    <th>Ngày trả</th>
                  </tr>
                </thead>
                <tbody>
                  {details.data?.data.loans.map((l: any) => (
                    <tr key={l.id}>
                      <td>{l.book?.title || 'Đã lưu trữ'}</td>
                      <td>
                        <Badge status={l.status} />
                      </td>
                      <td>{date(l.due_at)}</td>
                      <td>{date(l.returned_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3>Phí phạt</h3>
            {details.data?.data.fines.length ? (
              details.data.data.fines.map((f: any) => (
                <div className="member-fine" key={f.id}>
                  <span>
                    #{f.id} · {f.reason}
                  </span>
                  <strong>{money(f.amount - f.paid_amount - f.waived_amount)} còn nợ</strong>
                </div>
              ))
            ) : (
              <p className="muted">Không có khoản phí nào.</p>
            )}
          </>
        )}
      </Modal>
    </>
  )
}
function MemberForm({ user, onDone }: { user: any; onDone: () => void }) {
  const { can } = useAuth()
  const task = useTask()
  const [d, setD] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    password: '',
    locked: user?.locked || false,
    role: user?.roles[0] || 'Reader',
  })
  const { data } = useQuery({
    queryKey: ['roles'],
    queryFn: () => get('/roles'),
    enabled: can('roles.manage'),
  })
  const change = (k: string, v: any) => setD((p) => ({ ...p, [k]: v }))
  return (
    <form
      className="stack-form"
      onSubmit={(e) => {
        e.preventDefault()
        const payload: any = { ...d }
        if (!can('roles.manage')) delete payload.role
        if (user) delete payload.password
        task.mutate(
          {
            url: '/members' + (user ? '/' + user.id : ''),
            method: user ? 'put' : 'post',
            data: payload,
          },
          { onSuccess: onDone },
        )
      }}
    >
      <label className="form-label">
        Họ tên *
        <input
          required
          minLength={2}
          maxLength={100}
          value={d.name}
          onChange={(e) => change('name', e.target.value)}
        />
      </label>
      <label className="form-label">
        Email *
        <input
          type="email"
          required
          value={d.email}
          onChange={(e) => change('email', e.target.value)}
        />
      </label>
      <label className="form-label">
        Điện thoại
        <input maxLength={30} value={d.phone} onChange={(e) => change('phone', e.target.value)} />
      </label>
      {!user && (
        <label className="form-label">
          Mật khẩu ban đầu *
          <input
            required
            minLength={8}
            type="password"
            autoComplete="new-password"
            value={d.password}
            onChange={(e) => change('password', e.target.value)}
            placeholder="Ít nhất 8 ký tự"
          />
        </label>
      )}
      {can('roles.manage') && (
        <label className="form-label">
          Vai trò
          <select value={d.role} onChange={(e) => change('role', e.target.value)}>
            {data?.data.map((r: any) => (
              <option key={r.id}>{r.name}</option>
            ))}
          </select>
        </label>
      )}
      {user && (
        <label className="checkbox account-lock">
          <input
            type="checkbox"
            checked={d.locked}
            onChange={(e) => change('locked', e.target.checked)}
          />
          <span>
            Khóa tài khoản<small>Chặn đăng nhập và mượn mới. Lịch sử hiện có được giữ lại.</small>
          </span>
        </label>
      )}
      <div className="modal-actions">
        <Button variant="outline" type="button" onClick={onDone}>
          Quay lại
        </Button>
        <Button disabled={task.isPending}>Lưu thành viên</Button>
      </div>
    </form>
  )
}
