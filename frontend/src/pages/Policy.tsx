import { useQuery } from '@tanstack/react-query'
import { BookOpen, Clock, CalendarClock, Wallet, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { get } from '../lib/api'
import { money } from '../lib/utils'
import { PageHeading, ErrorState, Skeleton } from '../components/common'
import { Button } from '../components/ui/button'
export default function Policy() {
  const q = useQuery({ queryKey: ['public-settings'], queryFn: () => get('/public/settings') })
  const d = q.data?.data
  return (
    <div className="container policy-page">
      <PageHeading
        eyebrow="CÙNG GIỮ GÌN MỘT KHÔNG GIAN ĐẸP"
        title="Một lời hẹn với thư viện."
        description="Những quy định nhỏ giúp mỗi cuốn sách tiếp tục nhiều hành trình."
      />
      {q.isPending ? (
        <Skeleton />
      ) : q.isError ? (
        <ErrorState retry={() => q.refetch()} />
      ) : (
        <>
          <div className="policy-kpis">
            {[
              [BookOpen, d.max_books + ' cuốn', 'Số sách mượn tối đa'],
              [Clock, d.loan_days + ' ngày', 'Thời gian mỗi lượt mượn'],
              [CalendarClock, d.hold_hours + ' giờ', 'Thời gian giữ đặt trước'],
              [Wallet, money(d.fine_per_day), 'Phí trễ hạn mỗi ngày'],
            ].map(([Icon, value, label]: any) => (
              <div className="panel" key={label}>
                <Icon size={25} />
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <section className="panel policy-content">
            <h2>Chính sách thư viện</h2>
            <p>{d.policy}</p>
            <h3>Ghé thăm LIBRIVO</h3>
            <p>
              {d.opening_hours}
              <br />
              {d.address}
              <br />
              {d.contact_email} · {d.contact_phone}
            </p>
            <Button asChild>
              <Link to="/catalog">
                Khám phá một cuốn sách mới
                <ArrowUpRight size={16} />
              </Link>
            </Button>
          </section>
        </>
      )}
    </div>
  )
}
