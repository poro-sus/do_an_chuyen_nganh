import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
import {
  BookOpen,
  LibraryBig,
  Users,
  ArrowUpRight,
  Plus,
  ArrowLeftRight,
  Clock,
  Check,
  Wallet,
  CalendarDays,
  ChevronRight,
  Sparkles,
  Heart,
  ArrowRight,
  CalendarClock,
} from 'lucide-react'
import { get } from '../lib/api'
import { useAuth } from '../app/auth'
import { PageHeading, Counter, ErrorState, Skeleton, Cover, Empty } from '../components/common'
import { Button } from '../components/ui/button'
import { date, money, statusLabel } from '../lib/utils'
const colors = ['#7567E8', '#B3A9F2', '#DFD9FC', '#E9B97D', '#84B5A0', '#B9C6DF', '#D195AF']
export function KPI({
  label,
  value,
  icon: Icon,
  color = 'purple',
  note,
  currency = false,
}: {
  label: string
  value: number
  icon: any
  color?: string
  note?: string
  currency?: boolean
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-top">
        <span>{label}</span>
        <span className={'kpi-icon ' + color}>
          <Icon size={18} />
        </span>
      </div>
      <div className="kpi-value">
        <Counter value={value || 0} />
        {currency && <small>₫</small>}
      </div>
      <div className="kpi-note">{note || 'Dữ liệu hiện tại của thư viện'}</div>
    </div>
  )
}
export default function Dashboard() {
  const { user } = useAuth()
  const [period, setPeriod] = useState('30')
  const q = useQuery({
    queryKey: ['dashboard', period],
    queryFn: () => get('/dashboard', { period }),
  })
  const d = q.data?.data
  const k = d?.kpis
  return (
    <>
      <div className="dashboard-date">
        <span className="live-dot" />
        THƯ VIỆN CỦA BẠN, TRONG TẦM TAY
        <span>
          {new Date().toLocaleDateString('vi-VN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'Asia/Ho_Chi_Minh',
          })}
        </span>
      </div>
      <PageHeading
        title={
          'Chào ' + (user?.name.split(' ').slice(-2).join(' ') || 'bạn') + ', một ngày thật đẹp!'
        }
        description="Cùng xem những câu chuyện đang diễn ra trong thư viện hôm nay."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/admin/reports">
                <CalendarDays size={16} />
                Xem báo cáo
              </Link>
            </Button>
            <Button asChild>
              <Link to="/admin/books?create=1">
                <Plus size={17} />
                Thêm sách mới
              </Link>
            </Button>
          </>
        }
      />
      {q.isPending ? (
        <Skeleton />
      ) : q.isError ? (
        <ErrorState retry={() => q.refetch()} />
      ) : (
        <>
          <div className="dashboard-welcome">
            <div>
              <span className="eyebrow">KEEP THE STORIES FLOWING</span>
              <h2>
                Mỗi cuốn sách được mượn,
                <br />
                một hành trình mới bắt đầu.
              </h2>
              <p>
                Có <strong>{k.requests} yêu cầu mượn</strong> đang chờ bạn kết nối với người đọc.
              </p>
              <Link to="/admin/requests">
                Xử lý yêu cầu
                <ArrowRight size={15} />
              </Link>
            </div>
            <div className="welcome-book-art">
              <BookOpen size={104} strokeWidth={0.8} />
              <span className="welcome-spark">✧</span>
              <span className="welcome-art-label">
                A NEW CHAPTER
                <br />
                EVERY DAY.
              </span>
            </div>
          </div>
          <div className="kpi-grid">
            <KPI
              label="Tổng đầu sách"
              value={k.books}
              icon={BookOpen}
              note={k.copies + ' bản sao trong thư viện'}
            />
            <KPI
              label="Sách đang được mượn"
              value={k.active}
              icon={ArrowLeftRight}
              color="blue"
              note={k.monthly_loans + ' lượt mượn trong tháng này'}
            />
            <KPI
              label="Thành viên thư viện"
              value={k.members}
              icon={Users}
              color="orange"
              note={k.new_members + ' thành viên mới trong kỳ'}
            />
            <KPI
              label="Sách quá hạn"
              value={k.overdue}
              icon={Clock}
              color="red"
              note="Cần nhắc nhở người đọc trả sách"
            />
            <KPI label="Tổng bản sao" value={k.copies} icon={LibraryBig} color="blue" />
            <KPI label="Bản sao khả dụng" value={k.available} icon={Check} color="green" />
            <KPI label="Lượt mượn tháng này" value={k.monthly_loans} icon={CalendarClock} />
            <KPI
              label="Phí phạt chưa thanh toán"
              value={k.unpaid}
              icon={Wallet}
              color="orange"
              currency
              note="Tổng dư nợ sau thu và miễn giảm"
            />
          </div>
          <div className="dashboard-chart-grid">
            <section className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h3>Nhịp sống thư viện</h3>
                  <p>Xu hướng mượn và trả sách</p>
                </div>
                <select
                  aria-label="Khoảng thời gian thống kê"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  {[
                    ['7', '7 ngày qua'],
                    ['30', '30 ngày qua'],
                    ['90', '90 ngày qua'],
                    ['365', '12 tháng qua'],
                  ].map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="chart-legend">
                <span>
                  <i style={{ background: '#7567E8' }} />
                  Lượt mượn
                </span>
                <span>
                  <i style={{ background: '#A8CBBE' }} />
                  Lượt trả
                </span>
              </div>
              <div className="area-chart">
                <ResponsiveContainer width="100%" height={235}>
                  <AreaChart data={d.chart} margin={{ top: 12, right: 12, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="purple-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7567E8" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#7567E8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 5" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#8B8A9C', fontSize: 10 }}
                      minTickGap={35}
                      tickFormatter={(v) =>
                        period === '365' ? v.slice(5) : v.slice(8) + '/' + v.slice(5, 7)
                      }
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#8B8A9C', fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      name="Lượt mượn"
                      dataKey="borrowed"
                      stroke="#7567E8"
                      strokeWidth={2.5}
                      fill="url(#purple-area)"
                    />
                    <Area
                      type="monotone"
                      name="Lượt trả"
                      dataKey="returned"
                      stroke="#88B5A2"
                      strokeWidth={2}
                      fill="transparent"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="panel distribution-panel">
              <div className="panel-heading">
                <div>
                  <h3>Thế giới trên kệ sách</h3>
                  <p>Phân bố đầu sách theo danh mục</p>
                </div>
                <Link to="/admin/categories" aria-label="Xem danh mục">
                  <ArrowUpRight size={17} />
                </Link>
              </div>
              <div className="donut-wrap">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={d.categories.filter((c: any) => c.books_count)}
                      dataKey="books_count"
                      nameKey="name"
                      innerRadius={57}
                      outerRadius={78}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {d.categories
                        .filter((c: any) => c.books_count)
                        .map((c: any, i: number) => (
                          <Cell key={c.id} fill={colors[i % colors.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface)',
                        borderRadius: 12,
                        border: '1px solid var(--border)',
                        fontSize: 11,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-label">
                  <strong>{k.books}</strong>
                  <span>đầu sách</span>
                </div>
              </div>
              <div className="category-legend">
                {d.categories
                  .filter((c: any) => c.books_count)
                  .slice(0, 4)
                  .map((c: any, i: number) => (
                    <div key={c.id}>
                      <span>
                        <i style={{ background: colors[i] }} />
                        {c.name}
                      </span>
                      <strong>{c.books_count}</strong>
                    </div>
                  ))}
              </div>
            </section>
          </div>
          <div className="dashboard-bottom-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>
                    Yêu cầu đang chờ <span className="count-pill">{k.requests}</span>
                  </h3>
                  <p>Kết nối sách với người đọc tiếp theo</p>
                </div>
                <Link to="/admin/requests" className="text-link">
                  Xem tất cả
                  <ChevronRight size={14} />
                </Link>
              </div>
              <div className="table-scroll">
                <table className="data-table compact-table">
                  <thead>
                    <tr>
                      <th>Độc giả</th>
                      <th>Cuốn sách</th>
                      <th>Thời gian</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {d.pending.map((l: any) => (
                      <tr key={l.id}>
                        <td>
                          <div className="table-person">
                            <span className="avatar">{l.user.name.split(' ').slice(-1)[0][0]}</span>
                            <div>
                              <strong>{l.user.name}</strong>
                              <small>{l.user.member_code}</small>
                            </div>
                          </div>
                        </td>
                        <td className="book-title-cell">{l.book?.title}</td>
                        <td>{date(l.created_at)}</td>
                        <td>
                          <Link to="/admin/requests" className="small-link">
                            Xử lý
                            <ArrowUpRight size={13} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!d.pending.length && (
                  <Empty
                    title="Mọi yêu cầu đã được xử lý"
                    description="Thư viện đã sẵn sàng cho những hành trình mới."
                  />
                )}
              </div>
            </section>
            <section className="panel recent-activity">
              <div className="panel-heading">
                <div>
                  <h3>Những chuyển động nhỏ</h3>
                  <p>Hoạt động gần đây trong thư viện</p>
                </div>
                <HistoryIcon />
              </div>
              <div className="activity-list">
                {d.activity.map((a: any, i: number) => (
                  <div className="activity-item" key={a.id}>
                    <span className={'activity-dot activity-color-' + (i % 3)}>
                      <BookOpen size={14} />
                    </span>
                    <div>
                      <strong>{a.user?.name || 'Hệ thống'}</strong>
                      <p>{actionLabel(a.action)}</p>
                      <small>{date(a.created_at)}</small>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <div className="dashboard-bottom-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Những cuốn sách được tìm đến</h3>
                  <p>Được mượn nhiều nhất trong kỳ</p>
                </div>
                <Link className="text-link" to="/admin/reports">
                  Thống kê
                  <ArrowUpRight size={14} />
                </Link>
              </div>
              <div className="popular-list">
                {d.top_books.slice(0, 5).map((b: any, i: number) => (
                  <Link to={'/books/' + b.id} key={b.id}>
                    <span className="popular-index">{String(i + 1).padStart(2, '0')}</span>
                    <Cover book={b} />
                    <div>
                      <strong>{b.title}</strong>
                      <small>{b.authors?.[0]?.name}</small>
                    </div>
                    <b>
                      {b.loans_count}
                      <small>lượt mượn</small>
                    </b>
                  </Link>
                ))}
              </div>
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Hẹn gặp lại trên kệ sách</h3>
                  <p>Phiếu mượn cần được quan tâm</p>
                </div>
                <Clock size={18} />
              </div>
              <div className="due-list">
                {d.overdue_loans
                  .concat(d.due_soon)
                  .slice(0, 5)
                  .map((l: any) => (
                    <Link
                      to={'/admin/loans?status=' + (l.overdue ? 'overdue' : 'active')}
                      key={l.id}
                    >
                      <span className={'due-icon ' + (l.overdue ? 'late' : '')}>
                        <Clock size={17} />
                      </span>
                      <div>
                        <strong>{l.book?.title}</strong>
                        <small>{l.user?.name}</small>
                      </div>
                      <span className={l.overdue ? 'danger-text' : 'muted'}>
                        {date(l.due_at)}
                        <small>{l.overdue ? 'Đã quá hạn' : 'Sắp đến hạn'}</small>
                      </span>
                    </Link>
                  ))}
                {!d.overdue_loans.length && !d.due_soon.length && (
                  <Empty
                    title="Chưa có phiếu cần nhắc"
                    description="Hạn trả của các lượt mượn vẫn còn xa."
                  />
                )}
              </div>
            </section>
          </div>
          <DashboardTrends data={d} />
        </>
      )}
    </>
  )
}
function DashboardTrends({ data: d }: { data: any }) {
  const tooltip = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    fontSize: 11,
  }
  return (
    <>
      <div className="dashboard-extra-grid">
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h3>Những thành viên mới</h3>
              <p>Số tài khoản độc giả mới trong kỳ đã chọn.</p>
            </div>
          </div>
          <ResponsiveContainer height={175} width="100%">
            <BarChart data={d.member_trend} margin={{ left: -20, right: 15 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tickFormatter={(v) => v.slice(5)}
                tick={{ fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltip} />
              <Bar
                dataKey="count"
                name="Thành viên mới"
                fill="#a299d5"
                radius={[4, 4, 0, 0]}
                maxBarSize={25}
              />
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h3>Phí phạt theo thời gian</h3>
              <p>Tổng phí phát sinh, trước thanh toán và miễn giảm.</p>
            </div>
          </div>
          <ResponsiveContainer height={175} width="100%">
            <BarChart data={d.fine_trend} margin={{ left: -10, right: 15 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tickFormatter={(v) => v.slice(5)}
                tick={{ fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => (Number(v) >= 1000 ? Number(v) / 1000 + 'k' : v)}
                tick={{ fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltip} formatter={(v) => money(Number(v))} />
              <Bar
                dataKey="amount"
                name="Phí phát sinh"
                fill="#d5b381"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Tình trạng bản sao</h3>
              <p>Tất cả hiện vật đang được thư viện quản lý.</p>
            </div>
          </div>
          <div className="copy-status-summary">
            {d.copy_status.map((s: any, i: number) => (
              <div key={s.status}>
                <span>
                  <i style={{ background: colors[i % colors.length] }} />
                  {statusLabel[s.status] || s.status}
                </span>
                <strong>{s.count}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel chart-panel top-books-chart">
        <div className="panel-heading">
          <div>
            <h3>10 cuốn sách được mượn nhiều nhất</h3>
            <p>Thống kê theo ngày nhận sách trong kỳ đã chọn.</p>
          </div>
        </div>
        <ResponsiveContainer height={300} width="100%">
          <BarChart data={d.top_books} layout="vertical" margin={{ left: 0, right: 30 }}>
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="title"
              tickFormatter={(v) => (v.length > 25 ? v.slice(0, 25) + '…' : v)}
              width={145}
              tick={{ fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={tooltip} />
            <Bar
              dataKey="loans_count"
              name="Lượt mượn"
              fill="#9684d3"
              barSize={12}
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </>
  )
}
function HistoryIcon() {
  return <Clock size={18} />
}
export function actionLabel(s: string) {
  const a: Record<string, string> = {
    'loans.request': 'Gửi yêu cầu mượn sách',
    'loans.approve': 'Phê duyệt yêu cầu mượn',
    'loans.handoff': 'Bàn giao sách cho độc giả',
    'loans.return': 'Xác nhận sách đã trở lại',
    'books.create': 'Thêm đầu sách mới',
    'books.update': 'Cập nhật thông tin sách',
    'auth.login': 'Đăng nhập vào thư viện',
    'system.demo_seeded': 'Khởi tạo thư viện LIBRIVO',
    'reservations.create': 'Tham gia hàng chờ đặt trước',
    'fines.payment': 'Ghi nhận thanh toán phí phạt',
    'settings.update': 'Cập nhật cấu hình thư viện',
  }
  return a[s] || s
}
export function ReaderDashboard() {
  const { user } = useAuth()
  const q = useQuery({ queryKey: ['reader-summary'], queryFn: () => get('/me/summary') })
  const loans = useQuery({
    queryKey: ['loans', 'reader-active'],
    queryFn: () => get('/loans', { status: 'active' }),
  })
  const notifications = useQuery({
    queryKey: ['notifications', 'preview'],
    queryFn: () => get('/notifications'),
  })
  const d = q.data?.data
  return (
    <>
      <PageHeading
        eyebrow="MỘT CHƯƠNG MỚI CHO HÔM NAY"
        title={'Chào ' + (user?.name.split(' ').slice(-2).join(' ') || 'bạn') + '!'}
        description="Một cuốn sách hay luôn biết cách làm ngày của bạn khác đi."
        actions={
          <Button asChild>
            <Link to="/catalog">
              Tìm cuốn sách tiếp theo
              <ArrowUpRight size={17} />
            </Link>
          </Button>
        }
      />
      <div className="reader-banner">
        <span>
          <Sparkles size={18} />
          YOUR READING JOURNEY
        </span>
        <h2>
          Mỗi lần mở sách,
          <br />
          bạn lại mở rộng <em>chính mình.</em>
        </h2>
        <BookOpen size={120} strokeWidth={0.6} />
        <p>Không vội vàng. Mỗi trang sách đều có nhịp điệu riêng.</p>
      </div>
      {q.isPending ? (
        <Skeleton />
      ) : q.isError ? (
        <ErrorState retry={() => q.refetch()} />
      ) : (
        <>
          <div className="kpi-grid reader-kpis">
            <KPI
              label="Đang cùng bạn"
              value={d.active}
              icon={BookOpen}
              note="Cuốn sách đang được mượn"
            />
            <KPI
              label="Hành trình đã qua"
              value={d.returned}
              icon={Check}
              color="green"
              note="Lượt mượn đã hoàn tất"
            />
            <KPI
              label="Tủ sách yêu thích"
              value={d.favorites}
              icon={Heart}
              color="orange"
              note="Những cuốn sách bạn đã lưu"
            />
            <KPI
              label="Phí chưa thanh toán"
              value={d.unpaid}
              icon={Wallet}
              color="red"
              currency
              note={d.overdue ? d.overdue + ' sách cần trả ngay' : 'Cảm ơn bạn luôn giữ gìn sách'}
            />
          </div>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3>
                  Những người bạn đồng hành <span className="count-pill">{d.active}</span>
                </h3>
                <p>Đừng quên ngày hẹn trả để sách tiếp tục những hành trình mới.</p>
              </div>
              <Link to="/reader/loans" className="text-link">
                Sách của tôi
                <ArrowUpRight size={15} />
              </Link>
            </div>
            {loans.data?.data.length ? (
              <div className="reader-current-books">
                {loans.data.data.map((l: any) => (
                  <div className="reader-loan-card" key={l.id}>
                    <Link to={'/books/' + l.book_id}>
                      <Cover book={l.book} />
                    </Link>
                    <div>
                      <small className="purple">ĐANG MƯỢN</small>
                      <h3>{l.book?.title}</h3>
                      <p>{l.book?.authors?.[0]?.name}</p>
                      <span className={l.overdue ? 'danger-text' : 'muted'}>
                        <Clock size={13} />
                        Hạn trả: {date(l.due_at)}
                      </span>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/reader/loans">
                          Quản lý lượt mượn
                          <ArrowRight size={13} />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                title="Chưa có cuốn sách đồng hành"
                action={
                  <Button asChild>
                    <Link to="/catalog">
                      Khám phá thư viện
                      <ArrowRight size={15} />
                    </Link>
                  </Button>
                }
              />
            )}
          </section>
          <div className="dashboard-bottom-grid reader-bottom">
            <section className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h3>Dấu chân trong thư viện</h3>
                  <p>Số lượt yêu cầu mượn theo tháng, từ dữ liệu của bạn.</p>
                </div>
                <CalendarDays size={19} />
              </div>
              {d.history.length ? (
                <ResponsiveContainer height={230} width="100%">
                  <AreaChart data={d.history} margin={{ left: -20, right: 15 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip />
                    <Area
                      dataKey="count"
                      name="Lượt yêu cầu"
                      type="monotone"
                      stroke="#7567E8"
                      fill="#7567E822"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Empty
                  title="Hành trình chưa có dấu chân"
                  description="Biểu đồ sẽ xuất hiện khi bạn bắt đầu mượn sách."
                />
              )}
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Một vài lời nhắn</h3>
                  <p>Thông tin mới nhất dành cho bạn</p>
                </div>
                <Link to="/reader/notifications" className="text-link">
                  Tất cả
                  <ArrowUpRight size={15} />
                </Link>
              </div>
              <div className="notification-preview">
                {notifications.data?.data.slice(0, 3).map((n: any) => (
                  <Link to={n.data.url} key={n.id}>
                    <span className="activity-dot">
                      <BookOpen size={16} />
                    </span>
                    <div>
                      <strong>{n.data.title}</strong>
                      <p>{n.data.message}</p>
                      <small>{date(n.created_at)}</small>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </>
  )
}
