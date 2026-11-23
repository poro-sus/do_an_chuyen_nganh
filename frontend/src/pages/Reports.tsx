import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'
import { Download, Printer, ArrowLeftRight, Users, Wallet, Check, BookOpen } from 'lucide-react'
import { get } from '../lib/api'
import { PageHeading, Skeleton, ErrorState, Empty } from '../components/common'
import { Button } from '../components/ui/button'
import { KPI } from './Dashboard'
import { money, date, statusLabel } from '../lib/utils'
export default function Reports() {
  const [from, setFrom] = useState(() =>
    new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
  )
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [type, setType] = useState('loans')
  const [format, setFormat] = useState('xlsx')
  const valid = from <= to
  const q = useQuery({
    queryKey: ['reports', from, to],
    queryFn: () => get('/reports', { from, to }),
    enabled: valid,
  })
  const d = q.data?.data
  const colors = ['#7567E8', '#97BDAF', '#E2BD8E', '#B8AACB', '#7F9FC9']
  return (
    <>
      <PageHeading
        eyebrow="NHỮNG CON SỐ KỂ CÂU CHUYỆN"
        title="Góc nhìn toàn cảnh"
        description="Thống kê hoạt động, hiệu quả bộ sưu tập và tình hình lưu thông."
        actions={
          <Button variant="outline" onClick={() => window.print()}>
            <Printer size={16} />
            In báo cáo / PDF
          </Button>
        }
      />
      <div className="panel report-filters">
        <label>
          Từ ngày
          <input type="date" required value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Đến ngày
          <input
            type="date"
            required
            min={from}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <div className="report-export">
          <select
            aria-label="Dữ liệu báo cáo"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="loans">Lịch sử mượn</option>
            <option value="books">Bộ sưu tập sách</option>
            <option value="members">Thành viên</option>
            <option value="inventory">Tồn kho bản sao</option>
            <option value="fines">Phí phạt</option>
          </select>
          <select
            aria-label="Định dạng xuất"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
          >
            <option value="xlsx">Excel</option>
            <option value="csv">CSV</option>
          </select>
          <Button asChild>
            <a href={'/api/reports/export?' + new URLSearchParams({ type, format, from, to })}>
              <Download size={16} />
              Xuất dữ liệu
            </a>
          </Button>
        </div>
      </div>
      {!valid ? (
        <div role="alert" className="form-error">
          Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.
        </div>
      ) : q.isPending ? (
        <Skeleton />
      ) : q.isError ? (
        <ErrorState retry={() => q.refetch()} />
      ) : (
        <>
          <div className="kpi-grid">
            <KPI label="Lượt mượn trong kỳ" value={d.loans} icon={ArrowLeftRight} />
            <KPI label="Lượt trả trong kỳ" value={d.returns} icon={Check} color="green" />
            <KPI label="Thành viên mới" value={d.new_members} icon={Users} color="blue" />
            <KPI
              label="Đã thu trong kỳ"
              value={d.collected}
              icon={Wallet}
              color="orange"
              currency
              note={'Phí phát sinh: ' + money(d.fine_amount)}
            />
          </div>
          <div className="dashboard-bottom-grid">
            <section className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h3>Sức sống của bộ sưu tập</h3>
                  <p>10 đầu sách có nhiều lượt mượn trong kỳ</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={310}>
                <BarChart data={d.top_books} layout="vertical" margin={{ left: 0, right: 25 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border)" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="title"
                    width={125}
                    tick={{ fontSize: 10, fill: 'var(--muted)' }}
                    tickFormatter={(v) => (v.length > 22 ? v.slice(0, 22) + '…' : v)}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface)',
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                    }}
                  />
                  <Bar
                    dataKey="loans_count"
                    name="Lượt mượn"
                    fill="#7567E8"
                    radius={[0, 5, 5, 0]}
                    barSize={15}
                  />
                </BarChart>
              </ResponsiveContainer>
            </section>
            <section className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h3>Trạng thái kho sách</h3>
                  <p>Tồn kho hiện tại theo từng bản sao</p>
                </div>
                <BookOpen size={19} />
              </div>
              <ResponsiveContainer width="100%" height={310}>
                <BarChart data={d.inventory} margin={{ left: -15, right: 10, top: 15 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="status"
                    tickFormatter={(v) => statusLabel[v] || v}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    labelFormatter={(v) => statusLabel[String(v)] || String(v)}
                    contentStyle={{
                      background: 'var(--surface)',
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                    }}
                  />
                  <Bar dataKey="count" name="Bản sao" radius={[6, 6, 0, 0]} barSize={40}>
                    {d.inventory.map((r: any, i: number) => (
                      <Cell key={r.status} fill={colors[i % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </section>
          </div>
          <div className="dashboard-bottom-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Thành viên tích cực</h3>
                  <p>Theo số lượt mượn trong khoảng thời gian đã chọn.</p>
                </div>
              </div>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Thành viên</th>
                      <th>Mã thành viên</th>
                      <th>Lượt mượn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.active_members.map((u: any) => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td>{u.member_code}</td>
                        <td>
                          <span className="count-pill">{u.loans_count}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Phiếu quá hạn hiện tại</h3>
                  <p>Cần được nhắc trả để tiếp tục lưu thông.</p>
                </div>
              </div>
              {d.overdue.length ? (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Cuốn sách</th>
                        <th>Người mượn</th>
                        <th>Hạn trả</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.overdue.map((l: any) => (
                        <tr key={l.id}>
                          <td>{l.book?.title}</td>
                          <td>{l.user?.name}</td>
                          <td className="danger-text">{date(l.due_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty title="Không có phiếu quá hạn" />
              )}
            </section>
          </div>
        </>
      )}
    </>
  )
}
