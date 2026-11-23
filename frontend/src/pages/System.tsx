import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ShieldCheck,
  Plus,
  Lock,
  Save,
  Download,
  ArrowUpRight,
  Check,
  Settings as SettingsIcon,
} from 'lucide-react'
import { get, api, csrf, errorMessage } from '../lib/api'
import { toast } from 'sonner'
import { useTask } from '../app/auth'
import {
  PageHeading,
  Skeleton,
  ErrorState,
  Empty,
  SearchInput,
  useDebounce,
  Pagination,
} from '../components/common'
import { Button } from '../components/ui/button'
import { Modal } from '../components/ui/dialog'
import { date } from '../lib/utils'
import { actionLabel } from './Dashboard'
export function Roles() {
  const q = useQuery({ queryKey: ['roles'], queryFn: () => get('/roles') })
  const [selected, setSelected] = useState<any>(undefined)
  return (
    <>
      <PageHeading
        eyebrow="ĐÚNG QUYỀN, ĐÚNG TRÁCH NHIỆM"
        title="Vai trò & quyền hạn"
        description="Vai trò hệ thống được bảo vệ. Tạo thêm vai trò phù hợp với đội ngũ của bạn."
        actions={
          <Button onClick={() => setSelected(null)}>
            <Plus size={17} />
            Tạo vai trò
          </Button>
        }
      />
      {q.isPending ? (
        <Skeleton />
      ) : q.isError ? (
        <ErrorState retry={() => q.refetch()} />
      ) : (
        <div className="roles-grid">
          {q.data.data.map((r: any) => {
            const system = ['Super Admin', 'Librarian', 'Reader'].includes(r.name)
            return (
              <section className="panel role-card" key={r.id}>
                <div className="role-card-top">
                  <span className="role-icon">
                    <ShieldCheck size={25} />
                  </span>
                  {system && (
                    <span className="role-protected">
                      <Lock size={12} />
                      Vai trò hệ thống
                    </span>
                  )}
                </div>
                <h2>{r.name}</h2>
                <p>{r.permissions.length} quyền thao tác</p>
                <div className="role-permissions">
                  {r.permissions.map((p: any) => (
                    <span key={p.id}>
                      <Check size={12} />
                      {p.name}
                    </span>
                  ))}
                </div>
                <Button variant="outline" disabled={system} onClick={() => setSelected(r)}>
                  {system ? 'Được bảo vệ' : 'Chỉnh sửa quyền'}
                </Button>
              </section>
            )
          })}
        </div>
      )}
      <Modal
        open={selected !== undefined}
        onClose={() => setSelected(undefined)}
        title={selected ? 'Cập nhật vai trò' : 'Tạo vai trò tùy chỉnh'}
        description="Quyền nhạy cảm chỉ dành cho Super Admin. Phân quyền được kiểm tra tại API."
        wide
      >
        {selected !== undefined && (
          <RoleForm
            role={selected}
            permissions={q.data?.permissions || []}
            onDone={() => setSelected(undefined)}
          />
        )}
      </Modal>
    </>
  )
}
function RoleForm({
  role,
  permissions,
  onDone,
}: {
  role: any
  permissions: string[]
  onDone: () => void
}) {
  const [name, setName] = useState(role?.name || '')
  const [chosen, setChosen] = useState<string[]>(role?.permissions.map((p: any) => p.name) || [])
  const task = useTask()
  const sensitive = ['roles.manage', 'users.manage', 'settings.manage', 'audit.view', 'fines.waive']
  return (
    <form
      className="stack-form"
      onSubmit={(e) => {
        e.preventDefault()
        task.mutate(
          {
            url: '/roles' + (role ? '/' + role.id : ''),
            method: role ? 'put' : 'post',
            data: { name, permissions: chosen },
          },
          { onSuccess: onDone },
        )
      }}
    >
      <label className="form-label">
        Tên vai trò
        <input
          required
          disabled={!!role}
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className="permission-grid">
        {permissions.map((p) => (
          <label
            className={'checkbox ' + (sensitive.includes(p) ? 'permission-disabled' : '')}
            key={p}
          >
            <input
              type="checkbox"
              disabled={sensitive.includes(p)}
              checked={chosen.includes(p)}
              onChange={(e) =>
                setChosen((c) => (e.target.checked ? [...c, p] : c.filter((v) => v !== p)))
              }
            />
            <span>
              {p}
              {sensitive.includes(p) && <small>Chỉ Super Admin</small>}
            </span>
          </label>
        ))}
      </div>
      <div className="modal-actions">
        <Button variant="outline" type="button" onClick={onDone}>
          Quay lại
        </Button>
        <Button disabled={task.isPending}>Lưu vai trò</Button>
      </div>
    </form>
  )
}
export function Settings() {
  const q = useQuery({ queryKey: ['settings'], queryFn: () => get('/settings') })
  return (
    <>
      <PageHeading
        eyebrow="MỘT THƯ VIỆN THEO CÁCH CỦA BẠN"
        title="Cấu hình thư viện"
        description="Chính sách mới áp dụng cho giao dịch tiếp theo. Lịch sử cũ được giữ nguyên."
        actions={
          <Button variant="outline" asChild>
            <a href="/api/backup">
              <Download size={16} />
              Sao lưu dữ liệu JSON
            </a>
          </Button>
        }
      />
      {q.isPending ? (
        <Skeleton />
      ) : q.isError ? (
        <ErrorState retry={() => q.refetch()} />
      ) : (
        <SettingsForm initial={q.data.data} />
      )}
    </>
  )
}
const numbers = [
  ['loan_days', 'Thời gian mượn (ngày)', 1, 90],
  ['max_books', 'Số sách tối đa / thành viên', 1, 30],
  ['max_renewals', 'Số lần gia hạn tối đa', 0, 10],
  ['hold_hours', 'Thời gian giữ đặt trước (giờ)', 1, 720],
  ['fine_per_day', 'Phí trễ hạn / ngày (VND)', 0, 1000000],
  ['grace_days', 'Số ngày ân hạn', 0, 30],
  ['fine_cap', 'Mức phạt trễ tối đa (VND)', 0, 1000000000],
] as const
function SettingsForm({ initial }: { initial: any }) {
  const [d, setD] = useState(initial)
  const [uploading, setUploading] = useState(false)
  const uploadLogo = async (file?: File) => {
    if (!file) return
    setUploading(true)
    try {
      await csrf()
      const data = new FormData()
      data.append('image', file)
      const r = await api.post('/api/uploads/cover', data)
      setD((p: any) => ({ ...p, logo: r.data.data.url }))
      toast.success('Đã tải logo. Lưu cấu hình để áp dụng.')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setUploading(false)
    }
  }
  const task = useTask()
  const field = (k: string, v: string | number) => setD((p: any) => ({ ...p, [k]: v }))
  return (
    <form
      className="settings-form"
      onSubmit={(e) => {
        e.preventDefault()
        task.mutate({ url: '/settings', method: 'put', data: d })
      }}
    >
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Không gian & liên hệ</h3>
            <p>Thông tin xuất hiện trên website công khai.</p>
          </div>
          <SettingsIcon size={20} />
        </div>
        <div className="panel-form form-grid">
          <label className="form-label span-2">
            Logo thư viện
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              onChange={(e) => uploadLogo(e.target.files?.[0])}
            />
            <small>JPG, PNG, WebP · Tối đa 4MB</small>
            {d.logo && (
              <img className="settings-logo-preview" src={d.logo} alt="Logo thư viện hiện tại" />
            )}
          </label>
          {[
            ['library_name', 'Tên thư viện'],
            ['contact_email', 'Email liên hệ'],
            ['contact_phone', 'Điện thoại'],
            ['address', 'Địa chỉ'],
            ['opening_hours', 'Giờ hoạt động'],
          ].map(([k, l]) => (
            <label className={'form-label ' + (k === 'opening_hours' ? 'span-2' : '')} key={k}>
              {l}
              <input
                required={k === 'library_name'}
                type={k === 'contact_email' ? 'email' : 'text'}
                value={d[k] || ''}
                onChange={(e) => field(k, e.target.value)}
              />
            </label>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Chính sách lưu thông</h3>
            <p>Hạn mức, gia hạn, giữ chỗ và phí phạt.</p>
          </div>
          <ShieldCheck size={20} />
        </div>
        <div className="panel-form form-grid">
          {numbers.map(([k, l, min, max]) => (
            <label className="form-label" key={k}>
              {l}
              <input
                required
                type="number"
                min={min}
                max={max}
                value={d[k] ?? ''}
                onChange={(e) => field(k, Number(e.target.value))}
              />
            </label>
          ))}
          <p className="fine-print">
            Mức phạt tối đa bằng 0 nghĩa là không giới hạn. Tiền được lưu và tính bằng số nguyên
            VND.
          </p>
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Câu chuyện & chính sách thư viện</h3>
            <p>Nội dung giới thiệu xuất hiện tại trang chủ.</p>
          </div>
        </div>
        <div className="panel-form stack-form">
          <label className="form-label">
            Giới thiệu
            <textarea
              value={d.about || ''}
              maxLength={10000}
              onChange={(e) => field('about', e.target.value)}
            />
          </label>
          <label className="form-label">
            Chính sách
            <textarea
              value={d.policy || ''}
              maxLength={10000}
              onChange={(e) => field('policy', e.target.value)}
            />
          </label>
        </div>
      </section>
      <div className="settings-submit">
        <span>Mọi thay đổi được ghi vào nhật ký hệ thống.</span>
        <Button disabled={task.isPending || uploading}>
          <Save size={16} />
          {task.isPending ? 'Đang lưu…' : 'Lưu cấu hình'}
        </Button>
      </div>
    </form>
  )
}
export function AuditLogs() {
  const [search, setSearch] = useState('')
  const term = useDebounce(search)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<any>(null)
  const q = useQuery({
    queryKey: ['audit', term, page],
    queryFn: () => get('/audit-logs', { search: term, page }),
  })
  return (
    <>
      <PageHeading
        eyebrow="MINH BẠCH TRONG TỪNG THAO TÁC"
        title="Nhật ký hệ thống"
        description="Lịch sử các thao tác quan trọng, người thực hiện và thời điểm ghi nhận."
      />
      <section className="panel">
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={(s) => {
              setSearch(s)
              setPage(1)
            }}
            placeholder="Lọc hành động, ví dụ loans.return…"
          />
          <span className="muted">Chỉ xem · Không thể xóa nhật ký</span>
        </div>
        {q.isPending ? (
          <Skeleton />
        ) : q.isError ? (
          <ErrorState retry={() => q.refetch()} />
        ) : !q.data?.data.length ? (
          <Empty title="Chưa có nhật ký phù hợp" />
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Người thực hiện</th>
                    <th>Hành động</th>
                    <th>Đối tượng</th>
                    <th>Thời điểm</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {q.data.data.map((a: any) => (
                    <tr key={a.id}>
                      <td>
                        <div className="table-person">
                          <span className="avatar">{a.user?.name[0] || 'L'}</span>
                          <strong>{a.user?.name || 'Hệ thống'}</strong>
                        </div>
                      </td>
                      <td>
                        {actionLabel(a.action)}
                        <small className="cell-sub">
                          <code>{a.action}</code>
                        </small>
                      </td>
                      <td>{a.subject || '—'}</td>
                      <td>
                        {new Date(a.created_at).toLocaleString('vi-VN', {
                          timeZone: 'Asia/Ho_Chi_Minh',
                        })}
                      </td>
                      <td>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelected(a)}
                          aria-label="Chi tiết nhật ký"
                        >
                          <ArrowUpRight size={16} />
                        </Button>
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
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Chi tiết nhật ký"
        description={selected?.action}
      >
        <dl className="audit-detail">
          <div>
            <dt>Người thực hiện</dt>
            <dd>{selected?.user?.name || 'Hệ thống'}</dd>
          </div>
          <div>
            <dt>Đối tượng</dt>
            <dd>{selected?.subject || '—'}</dd>
          </div>
          <div>
            <dt>Địa chỉ IP</dt>
            <dd>{selected?.ip || 'Tác vụ hệ thống'}</dd>
          </div>
          <div>
            <dt>Ngày ghi nhận</dt>
            <dd>{date(selected?.created_at)}</dd>
          </div>
        </dl>
        <pre className="audit-json">{JSON.stringify(selected?.data || {}, null, 2)}</pre>
      </Modal>
    </>
  )
}
