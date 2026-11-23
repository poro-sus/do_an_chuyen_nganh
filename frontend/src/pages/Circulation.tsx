import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, ArrowUpRight, Check, Undo2, CalendarClock, BookOpen, Download } from 'lucide-react'
import { get } from '../lib/api'
import { useAuth, useTask } from '../app/auth'
import {
  PageHeading,
  SearchInput,
  useDebounce,
  ErrorState,
  Skeleton,
  Empty,
  Pagination,
  Badge,
  Cover,
} from '../components/common'
import { Button } from '../components/ui/button'
import { Modal } from '../components/ui/dialog'
import { date, money } from '../lib/utils'
type Kind = 'loans' | 'requests' | 'reservations' | 'renewals' | 'fines'
const config: Record<Kind, { title: string; description: string; endpoint: string }> = {
  loans: {
    title: 'Những hành trình của sách',
    description: 'Theo dõi bàn giao, hạn trả và đưa những cuốn sách trở lại kệ.',
    endpoint: '/loans',
  },
  requests: {
    title: 'Kết nối sách với người đọc',
    description: 'Kiểm tra, phê duyệt và chuẩn bị sách cho những hành trình mới.',
    endpoint: '/loans',
  },
  reservations: {
    title: 'Những cuộc hẹn với sách',
    description: 'Hàng chờ công bằng. Đúng người, đúng cuốn sách, đúng thời điểm.',
    endpoint: '/reservations',
  },
  renewals: {
    title: 'Thêm thời gian cho một câu chuyện',
    description: 'Xem xét yêu cầu gia hạn theo chính sách và hàng chờ của thư viện.',
    endpoint: '/loan-renewals',
  },
  fines: {
    title: 'Phí phạt & thanh toán',
    description: 'Theo dõi dư nợ, ghi nhận thanh toán và lịch sử miễn giảm.',
    endpoint: '/fines',
  },
}
export default function Circulation({
  kind = 'loans',
  reader = false,
}: {
  kind?: Kind
  reader?: boolean
}) {
  const { can } = useAuth()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<any>(null)
  const [action, setAction] = useState('')
  const [reason, setReason] = useState('')
  const [condition, setCondition] = useState('good')
  const [amount, setAmount] = useState(0)
  const [copyId, setCopyId] = useState('')
  const [create, setCreate] = useState(false)
  const task = useTask()
  const cfg = config[kind]
  const status =
    params.get('status') ||
    (kind === 'requests' ? 'requested' : kind === 'renewals' ? 'requested' : '')
  const q = useQuery({
    queryKey: [kind, 'table', page, status, debounced],
    queryFn: () => get(cfg.endpoint, { page, status, search: debounced }),
  })
  const copies = useQuery({
    queryKey: ['assign-copies', selected?.book_id],
    queryFn: () => get('/book-copies', { book_id: selected?.book_id, status: 'available' }),
    enabled: action === 'approve' && !!selected,
  })
  const open = (row: any, a: string) => {
    setSelected(row)
    setAction(a)
    setReason('')
    setAmount(
      a === 'payment' || a === 'waiver' ? row.amount - row.paid_amount - row.waived_amount : 0,
    )
    setCondition('good')
    setCopyId('')
  }
  const perform = () => {
    let url = ''
    let data: any = {}
    let method: 'post' | 'put' | 'delete' = 'post'
    if (kind === 'reservations') {
      if (action === 'claim') {
        url = '/loan-requests'
        data = { book_id: selected.book_id }
      } else {
        url = '/reservations/' + selected.id
        method = 'delete'
      }
    } else if (kind === 'renewals') {
      url = '/loan-renewals/' + selected.id
      method = 'put'
      data = { approve: action === 'renew-approve', reason }
    } else if (kind === 'fines') {
      url = '/fines/' + selected.id + '/payments'
      data = { type: action, amount, note: reason }
    } else {
      url = '/loans/' + selected.id + '/' + action
      data = { reason, condition, damage_fee: amount, copy_id: copyId ? Number(copyId) : undefined }
    }
    task.mutate(
      { url, data, method },
      {
        onSuccess: () => {
          setSelected(null)
          setAction('')
        },
      },
    )
  }
  const titles: Record<string, string> = {
    approve: 'Phê duyệt yêu cầu mượn',
    handoff: 'Xác nhận bàn giao sách',
    return: 'Ghi nhận sách trở lại',
    reject: 'Từ chối yêu cầu',
    cancel: 'Hủy yêu cầu',
    renew: 'Gửi yêu cầu gia hạn',
    'renew-approve': 'Chấp thuận gia hạn',
    'renew-reject': 'Từ chối gia hạn',
    payment: 'Ghi nhận thanh toán',
    waiver: 'Miễn giảm phí phạt',
    claim: 'Yêu cầu nhận sách đang giữ',
  }
  const states =
    kind === 'loans'
      ? [
          ['', 'Tất cả'],
          ['active', 'Đang mượn'],
          ['approved', 'Chờ nhận'],
          ['overdue', 'Quá hạn'],
          ['returned', 'Đã trả'],
          ['cancelled', 'Đã hủy'],
        ]
      : kind === 'requests'
        ? [
            ['requested', 'Chờ duyệt'],
            ['approved', 'Đã duyệt'],
            ['rejected', 'Từ chối'],
            ['cancelled', 'Đã hủy'],
          ]
        : kind === 'reservations'
          ? [
              ['', 'Tất cả'],
              ['waiting', 'Đang chờ'],
              ['ready', 'Sẵn sàng'],
              ['fulfilled', 'Đã nhận'],
              ['expired', 'Hết hạn'],
            ]
          : kind === 'renewals'
            ? [
                ['requested', 'Chờ duyệt'],
                ['approved', 'Đã duyệt'],
                ['rejected', 'Từ chối'],
              ]
            : [
                ['', 'Tất cả'],
                ['unpaid', 'Chưa thanh toán'],
              ]
  return (
    <>
      <PageHeading
        eyebrow={reader ? 'KHÔNG GIAN CỦA BẠN' : 'HOẠT ĐỘNG THƯ VIỆN'}
        title={
          reader
            ? {
                loans: 'Sách của tôi',
                requests: 'Yêu cầu của tôi',
                reservations: 'Sách đang chờ bạn',
                fines: 'Phí phạt của tôi',
                renewals: cfg.title,
              }[kind]
            : cfg.title
        }
        description={cfg.description}
        actions={
          !reader && (kind === 'loans' || kind === 'requests') ? (
            <Button onClick={() => setCreate(true)}>
              <Plus size={17} />
              Tạo phiếu mượn
            </Button>
          ) : reader ? (
            <Button asChild variant="outline">
              <Link to="/catalog">
                Khám phá thư viện
                <ArrowUpRight size={16} />
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <a href={'/api/reports/export?type=' + (kind === 'fines' ? 'fines' : 'loans')}>
                <Download size={16} />
                Xuất dữ liệu
              </a>
            </Button>
          )
        }
      />
      <section className="panel">
        <div className="table-toolbar">
          <div className="data-tabs">
            {states.map(([s, l]) => (
              <button
                key={s}
                className={status === s ? 'active' : ''}
                onClick={() => {
                  setParams(s ? { status: s } : {})
                  setPage(1)
                }}
              >
                {l}
              </button>
            ))}
          </div>
          {(kind === 'loans' || kind === 'requests') && (
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v)
                setPage(1)
              }}
              placeholder="Tên sách, độc giả, barcode…"
            />
          )}
        </div>
        {q.isPending ? (
          <Skeleton />
        ) : q.isError ? (
          <ErrorState retry={() => q.refetch()} />
        ) : !q.data?.data.length ? (
          <Empty
            title="Chưa có dữ liệu trong mục này"
            description={
              reader
                ? 'Khám phá thư viện để tìm cuốn sách dành cho bạn.'
                : 'Các giao dịch phù hợp sẽ được hiển thị tại đây.'
            }
          />
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{kind === 'fines' ? 'Khoản phí' : 'Cuốn sách'}</th>
                    {!reader && <th>Độc giả</th>}
                    <th>
                      {kind === 'fines'
                        ? 'Số tiền'
                        : kind === 'renewals'
                          ? 'Hạn trả trước'
                          : 'Ngày tạo'}
                    </th>
                    <th>
                      {kind === 'loans'
                        ? 'Hạn trả'
                        : kind === 'reservations'
                          ? 'Vị trí / Hạn giữ'
                          : kind === 'fines'
                            ? 'Còn phải trả'
                            : 'Trạng thái'}
                    </th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.data.map((row: any) => {
                    const b = row.book || row.loan?.book
                    const person = row.user || row.loan?.user
                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="table-book">
                            {b && <Cover book={b} />}
                            <div>
                              <Link to={'/books/' + (b?.id || row.book_id)}>
                                {b?.title || 'Sách đã lưu trữ'}
                              </Link>
                              <small>
                                {kind === 'fines'
                                  ? (
                                      {
                                        overdue: 'Trả trễ hạn',
                                        damage: 'Hư hỏng',
                                        lost: 'Mất sách',
                                      } as any
                                    )[row.type] +
                                    ' · #' +
                                    row.id
                                  : row.copy?.barcode || 'Phiếu #' + row.id}
                              </small>
                            </div>
                          </div>
                        </td>
                        {!reader && (
                          <td>
                            <div className="table-person">
                              <span className="avatar">
                                {person?.name?.split(' ').slice(-1)[0][0] || '?'}
                              </span>
                              <div>
                                <strong>{person?.name}</strong>
                                <small>{person?.member_code}</small>
                              </div>
                            </div>
                          </td>
                        )}
                        <td>
                          {kind === 'fines' ? (
                            <>
                              <strong>{money(row.amount)}</strong>
                              <small className="cell-sub">Đã thu {money(row.paid_amount)}</small>
                            </>
                          ) : kind === 'renewals' ? (
                            date(row.previous_due_at)
                          ) : (
                            <>
                              {date(row.created_at)}
                              {kind === 'loans' && (
                                <small className="cell-sub">
                                  <Badge status={row.status} />
                                </small>
                              )}
                            </>
                          )}
                        </td>
                        <td>
                          {kind === 'loans' ? (
                            <>
                              <span className={row.overdue ? 'danger-text' : ''}>
                                {date(row.due_at)}
                              </span>
                              {row.overdue && (
                                <small className="cell-sub danger-text">Cần trả sách</small>
                              )}
                            </>
                          ) : kind === 'reservations' ? (
                            <>
                              <Badge status={row.status} />
                              <small className="cell-sub">
                                {row.status === 'waiting'
                                  ? 'Vị trí #' + row.queue_position
                                  : row.status === 'ready'
                                    ? 'Giữ đến ' + date(row.expires_at)
                                    : '—'}
                              </small>
                            </>
                          ) : kind === 'fines' ? (
                            <>
                              <strong
                                className={
                                  row.amount - row.paid_amount - row.waived_amount > 0
                                    ? 'danger-text'
                                    : 'success-text'
                                }
                              >
                                {money(row.amount - row.paid_amount - row.waived_amount)}
                              </strong>
                              {row.waived_amount > 0 && (
                                <small className="cell-sub">
                                  Đã miễn {money(row.waived_amount)}
                                </small>
                              )}
                            </>
                          ) : (
                            <Badge status={row.status} />
                          )}
                        </td>
                        <td>
                          <div className="row-actions">
                            {['loans', 'requests'].includes(kind) && (
                              <>
                                {!reader && row.status === 'requested' && (
                                  <>
                                    <Button size="sm" onClick={() => open(row, 'approve')}>
                                      Duyệt
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => open(row, 'reject')}
                                    >
                                      Từ chối
                                    </Button>
                                  </>
                                )}
                                {!reader && row.status === 'approved' && (
                                  <Button size="sm" onClick={() => open(row, 'handoff')}>
                                    Bàn giao
                                  </Button>
                                )}
                                {!reader && row.status === 'active' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => open(row, 'return')}
                                  >
                                    <Undo2 size={13} />
                                    Trả sách
                                  </Button>
                                )}
                                {reader && row.status === 'active' && !row.overdue && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={row.renewals?.some(
                                      (r: any) => r.status === 'requested',
                                    )}
                                    onClick={() => open(row, 'renew')}
                                  >
                                    <CalendarClock size={13} />
                                    {row.renewals?.some((r: any) => r.status === 'requested')
                                      ? 'Đang chờ gia hạn'
                                      : 'Gia hạn'}
                                  </Button>
                                )}
                                {reader && ['requested', 'approved'].includes(row.status) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => open(row, 'cancel')}
                                  >
                                    Hủy
                                  </Button>
                                )}
                                {row.status === 'returned' && (
                                  <Button asChild variant="ghost" size="sm">
                                    <Link to={'/books/' + row.book_id}>
                                      Xem sách
                                      <ArrowUpRight size={13} />
                                    </Link>
                                  </Button>
                                )}
                              </>
                            )}
                            {kind === 'reservations' &&
                              ['waiting', 'ready'].includes(row.status) && (
                                <>
                                  {reader && row.status === 'ready' && (
                                    <Button size="sm" onClick={() => open(row, 'claim')}>
                                      Yêu cầu nhận
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => open(row, 'cancel')}
                                  >
                                    Hủy đặt trước
                                  </Button>
                                </>
                              )}
                            {kind === 'renewals' && row.status === 'requested' && (
                              <>
                                <Button size="sm" onClick={() => open(row, 'renew-approve')}>
                                  Duyệt
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => open(row, 'renew-reject')}
                                >
                                  Từ chối
                                </Button>
                              </>
                            )}
                            {kind === 'fines' &&
                              !reader &&
                              row.amount > row.paid_amount + row.waived_amount && (
                                <>
                                  <Button size="sm" onClick={() => open(row, 'payment')}>
                                    Thu phí
                                  </Button>
                                  {can('fines.waive') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => open(row, 'waiver')}
                                    >
                                      Miễn giảm
                                    </Button>
                                  )}
                                </>
                              )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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
      {kind === 'fines' && q.data?.data.some((f: any) => f.payments?.length > 0) && (
        <section className="panel finance-history">
          <div className="panel-heading">
            <div>
              <h3>Lịch sử ghi nhận</h3>
              <p>Các khoản thu và miễn giảm của những phí đang hiển thị.</p>
            </div>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Khoản phí</th>
                  <th>Ngày ghi nhận</th>
                  <th>Hình thức</th>
                  <th>Số tiền</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {q.data.data.flatMap((f: any) =>
                  f.payments.map((p: any) => (
                    <tr key={p.id}>
                      <td>
                        #{f.id} · {f.loan?.book?.title}
                      </td>
                      <td>{date(p.created_at)}</td>
                      <td>{p.type === 'waiver' ? 'Miễn giảm' : 'Thanh toán'}</td>
                      <td>{money(p.amount)}</td>
                      <td>{p.note}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <Modal
        open={!!selected}
        onClose={() => {
          setSelected(null)
          setAction('')
        }}
        title={titles[action] || 'Xác nhận thay đổi'}
        description={
          action === 'return'
            ? 'Bản sao và phí phạt sẽ được cập nhật cùng lúc. Thao tác này kết thúc lượt mượn.'
            : action === 'handoff'
              ? 'Chỉ xác nhận khi độc giả đã nhận sách. Thời hạn mượn bắt đầu từ lúc này.'
              : 'Thao tác được ghi lại trong lịch sử của thư viện.'
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            perform()
          }}
        >
          <div className="action-summary">
            <BookOpen size={22} />
            <div>
              <strong>{selected?.book?.title || selected?.loan?.book?.title}</strong>
              <p>
                {selected?.user?.name || selected?.loan?.user?.name || 'Phiếu #' + selected?.id}
              </p>
            </div>
          </div>
          {action === 'approve' && (
            <label className="form-label">
              Chỉ định bản sao
              <select value={copyId} onChange={(e) => setCopyId(e.target.value)}>
                <option value="">Tự chọn bản khả dụng / bản đang giữ của độc giả</option>
                {copies.data?.data.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.barcode} · {c.shelf?.name || 'Chưa xếp kệ'}
                  </option>
                ))}
              </select>
              <small>Hệ thống kiểm tra lại khả dụng tại thời điểm phê duyệt.</small>
            </label>
          )}
          {action === 'return' && (
            <>
              <label className="form-label">
                Tình trạng khi trả
                <select value={condition} onChange={(e) => setCondition(e.target.value)}>
                  <option value="good">Tốt — nhập lại kho</option>
                  <option value="worn">Đã sử dụng — nhập lại kho</option>
                  <option value="damaged">Hư hỏng — chuyển bảo trì</option>
                  <option value="lost">Mất sách — ghi nhận mất</option>
                </select>
              </label>
              {condition === 'damaged' && (
                <label className="form-label">
                  Phí hư hỏng (VND)
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                  />
                </label>
              )}
              {condition === 'lost' && (
                <p className="info-box">
                  Phí mất sách dựa trên giá tham khảo của đầu sách. Nếu giá chưa cập nhật, không tự
                  tạo khoản phí mất sách.
                </p>
              )}
            </>
          )}
          {['payment', 'waiver'].includes(action) && (
            <label className="form-label">
              Số tiền (VND)
              <input
                type="number"
                min={1}
                max={selected ? selected.amount - selected.paid_amount - selected.waived_amount : 0}
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </label>
          )}
          {['reject', 'renew-reject', 'payment', 'waiver'].includes(action) && (
            <label className="form-label">
              {kind === 'fines' ? 'Ghi chú / Số biên nhận' : 'Lý do'}
              <textarea
                required
                maxLength={2000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập thông tin để lưu lịch sử…"
              />
            </label>
          )}
          {['renew', 'renew-approve'].includes(action) && (
            <p className="info-box">
              Yêu cầu chỉ được chấp nhận nếu phiếu chưa quá hạn, còn số lần gia hạn và không có
              người chờ đặt trước.
            </p>
          )}
          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={() => setSelected(null)}>
              Quay lại
            </Button>
            <Button disabled={task.isPending}>
              {task.isPending ? 'Đang xử lý…' : 'Xác nhận'}
              <Check size={15} />
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={create}
        onClose={() => setCreate(false)}
        title="Tạo yêu cầu mượn tại quầy"
        description="Chọn thành viên và đầu sách. Phiếu mới cần được phê duyệt trước khi bàn giao."
      >
        <CreateLoanForm onDone={() => setCreate(false)} />
      </Modal>
    </>
  )
}
function CreateLoanForm({ onDone }: { onDone: () => void }) {
  const task = useTask()
  const [memberSearch, setMemberSearch] = useState('')
  const [bookSearch, setBookSearch] = useState('')
  const [userId, setUserId] = useState('')
  const [bookId, setBookId] = useState('')
  const member = useDebounce(memberSearch)
  const book = useDebounce(bookSearch)
  const members = useQuery({
    queryKey: ['members', 'loan-select', member],
    queryFn: () => get('/members', { search: member }),
  })
  const books = useQuery({
    queryKey: ['books', 'loan-select', book],
    queryFn: () => get('/books', { search: book, available: true, per_page: 100 }),
  })
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        task.mutate(
          { url: '/loan-requests', data: { user_id: Number(userId), book_id: Number(bookId) } },
          { onSuccess: onDone },
        )
      }}
      className="stack-form"
    >
      <label className="form-label">
        Thành viên
        <SearchInput
          value={memberSearch}
          onChange={setMemberSearch}
          placeholder="Tìm tên hoặc mã thành viên…"
        />
        <select required value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Chọn thành viên</option>
          {members.data?.data
            .filter((u: any) => !u.locked)
            .map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.name} · {u.member_code}
              </option>
            ))}
        </select>
      </label>
      <label className="form-label">
        Đầu sách
        <SearchInput value={bookSearch} onChange={setBookSearch} placeholder="Tìm tên sách…" />
        <select required value={bookId} onChange={(e) => setBookId(e.target.value)}>
          <option value="">Chọn sách khả dụng</option>
          {books.data?.data.map((b: any) => (
            <option value={b.id} key={b.id}>
              {b.title} · {b.available_count} bản
            </option>
          ))}
        </select>
      </label>
      <div className="modal-actions">
        <Button variant="outline" type="button" onClick={onDone}>
          Quay lại
        </Button>
        <Button disabled={task.isPending || !userId || !bookId}>
          <Plus size={15} />
          Tạo yêu cầu
        </Button>
      </div>
    </form>
  )
}
