import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  ArrowUpRight,
  Heart,
  Star,
  BookOpen,
  Clock,
  Check,
  MapPin,
  ShieldCheck,
  Send,
  CalendarClock,
} from 'lucide-react'
import { get } from '../lib/api'
import { useAuth, useTask } from '../app/auth'
import { Cover, BookCard, ErrorState, Skeleton, Empty } from '../components/common'
import { Button } from '../components/ui/button'
import { Modal } from '../components/ui/dialog'
import type { Book } from '../types'
import { date } from '../lib/utils'
import {
  BookReadingContent,
  BookDetailSidebar,
  ReviewDistribution,
} from '../components/books/BookReadingContent'
export default function BookDetail() {
  const { id } = useParams()
  const { user, requestLogin } = useAuth()
  const task = useTask()
  const [confirm, setConfirm] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [activeSection, setActiveSection] = useState('book-overview')
  const q = useQuery({ queryKey: ['book', id], queryFn: () => get<{ data: Book }>('/books/' + id) })
  useEffect(() => {
    if (!q.data) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveSection(visible[0].target.id)
      },
      { rootMargin: '-65px 0px -55% 0px' },
    )
    document
      .querySelectorAll('.book-content-section[id], #book-reviews')
      .forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [q.data])
  const { data: favorites } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => get('/favorites'),
    enabled: !!user,
  })
  const { data: reservations } = useQuery({
    queryKey: ['reservations', 'own-detail', id],
    queryFn: () => get('/reservations'),
    enabled: !!user,
  })
  const { data: loans } = useQuery({
    queryKey: ['loans', 'detail', id],
    queryFn: () => get('/loans'),
    enabled: !!user,
  })
  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => get('/public/settings'),
  })
  const related = useQuery({
    queryKey: ['related', q.data?.data.categories[0]?.id],
    queryFn: () => get('/books', { category: q.data?.data.categories[0]?.id, per_page: 5 }),
    enabled: !!q.data?.data.categories[0],
  })
  if (q.isPending)
    return (
      <div className="container detail-page">
        <Skeleton />
      </div>
    )
  if (q.isError || !q.data)
    return (
      <div className="container detail-page">
        <ErrorState retry={() => q.refetch()} />
      </div>
    )
  const b = q.data.data
  const saved = favorites?.data?.includes(b.id)
  const hold =
    b.my_reservation ||
    reservations?.data?.find(
      (r: any) =>
        r.book_id === b.id &&
        r.user_id === user?.id &&
        r.status === 'ready' &&
        new Date(r.expires_at) > new Date(),
    )
  const active =
    b.my_loan ||
    loans?.data?.find(
      (l: any) =>
        l.book_id === b.id &&
        l.user_id === user?.id &&
        ['requested', 'approved', 'active'].includes(l.status),
    )
  const canReview =
    b.can_review ||
    loans?.data?.some(
      (l: any) => l.book_id === b.id && l.user_id === user?.id && l.status === 'returned',
    )
  const borrow = b.available_count > 0 || hold
  const request = () => {
    if (!user) {
      requestLogin()
      return
    }
    setConfirm(true)
  }
  return (
    <div className="container detail-page">
      <div className="catalog-breadcrumb">
        <Link to="/">Trang chủ</Link>
        <span>/</span>
        <Link to="/catalog">Thư viện</Link>
        <span>/</span>
        {b.title}
      </div>
      <div className="book-detail-grid">
        <div className="detail-art">
          <div className="detail-cover-wrap">
            <Cover book={b} />
            <span className="detail-art-stamp">A WORLD BETWEEN TWO COVERS</span>
          </div>
          <div className="detail-art-footer">
            <BookOpen size={16} />
            <span>Một cuốn sách. Vô vàn góc nhìn.</span>
            <span>✧</span>
          </div>
        </div>
        <div className="detail-copy">
          <div className="detail-categories">
            {b.categories.map((c) => (
              <Link key={c.id} to={'/catalog?category=' + c.id}>
                {c.name}
                <ArrowUpRight size={12} />
              </Link>
            ))}
          </div>
          <h1>{b.title}</h1>
          <p className="detail-author">
            bởi{' '}
            {b.authors.map((a, i) => (
              <span key={a.id}>
                {i > 0 ? ', ' : ''}
                <Link to={'/catalog?search=' + encodeURIComponent(a.name)}>{a.name}</Link>
              </span>
            ))}
          </p>
          <div className="detail-rating">
            {b.rating ? (
              <>
                <Star size={16} fill="currentColor" />
                <strong>{b.rating}/5</strong>
                <span>({b.reviews_count} đánh giá)</span>
              </>
            ) : (
              <span>Chưa có đánh giá</span>
            )}
            <i /> <span>{b.loans_count} lượt mượn</span>
          </div>
          <p className="detail-summary">
            {b.summary || 'Một tác phẩm trong bộ sưu tập được tuyển chọn tại LIBRIVO.'}
          </p>
          <div className="detail-specs">
            {[
              ['Ngôn ngữ', b.language],
              ['Số trang', b.pages ? b.pages + ' trang' : 'Chưa cập nhật'],
              ['Nhà xuất bản', b.publisher?.name || 'Chưa cập nhật'],
              ['Năm xuất bản', b.year || 'Chưa cập nhật'],
            ].map(([l, v]) => (
              <div key={l}>
                <span>{l}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
          <div className={'detail-availability ' + (!borrow ? 'unavailable' : '')}>
            <span className="availability-icon">
              {borrow ? <Check size={22} /> : <CalendarClock size={22} />}
            </span>
            <div>
              <strong>
                {hold
                  ? 'Sách đang được giữ riêng cho bạn'
                  : borrow
                    ? 'Sẵn sàng cho hành trình tiếp theo'
                    : 'Cuốn sách đang trên một hành trình khác'}
              </strong>
              <span>
                {hold
                  ? 'Gửi yêu cầu trước ' + date(hold.expires_at)
                  : borrow
                    ? b.available_count +
                      ' / ' +
                      b.copies_count +
                      ' bản khả dụng · Có thể mượn tại thư viện'
                    : 'Đặt trước để được thông báo ngay khi sách trở lại.'}
              </span>
            </div>
          </div>
          {b.shelves?.length ? (
            <p className="detail-isbn">Vị trí: {b.shelves.map((s) => s.name).join(' · ')}</p>
          ) : null}
          <div className="detail-actions">
            <Button disabled={!!active || task.isPending} onClick={request}>
              {active ? (
                <>
                  <Check size={18} />
                  Bạn đã có phiếu mượn
                </>
              ) : borrow ? (
                <>
                  <BookOpen size={18} />
                  Gửi yêu cầu mượn
                  <ArrowRight size={17} />
                </>
              ) : (
                <>
                  <CalendarClock size={18} />
                  Đặt trước cuốn sách
                  <ArrowRight size={17} />
                </>
              )}
            </Button>
            <Button
              variant="outline"
              disabled={task.isPending}
              onClick={() =>
                user
                  ? task.mutate({
                      url: '/favorites/' + b.id,
                      method: 'put',
                      data: { saved: !saved },
                    })
                  : requestLogin()
              }
              aria-label="Lưu yêu thích"
            >
              <Heart size={19} fill={saved ? 'currentColor' : 'none'} />
              {saved ? 'Đã lưu' : 'Lưu sách'}
            </Button>
          </div>
          <div className="detail-policy">
            <span>
              <Clock size={15} />
              Mượn {settings?.data?.loan_days || 14} ngày
            </span>
            <span>
              <ShieldCheck size={15} />
              Miễn phí thành viên
            </span>
            <span>
              <MapPin size={15} />
              Nhận sách tại thư viện
            </span>
          </div>
          {b.isbn && <p className="detail-isbn">ISBN: {b.isbn}</p>}
        </div>
      </div>
      <nav className="book-section-tabs" aria-label="Chuyển đến nội dung sách">
        {[
          ['book-overview', 'Giới thiệu'],
          ...(b.editorial?.topics?.length ? [['book-topics', 'Nội dung nổi bật']] : []),
          ['book-reading-guide', 'Gợi ý đọc'],
          ['book-authors', 'Tác giả'],
          ['book-edition', 'Thông tin ấn bản'],
          ['book-reviews', 'Đánh giá'],
        ].map(([section, label]) => (
          <a
            href={'#' + section}
            key={section}
            aria-current={activeSection === section ? 'location' : undefined}
            onClick={() => setActiveSection(section)}
          >
            {label}
            {section === 'book-reviews' && <span>{b.reviews_count}</span>}
          </a>
        ))}
      </nav>
      <div className="detail-bottom-grid">
        <section className="detail-description">
          <BookReadingContent book={b} />
          <div id="book-reviews" className="detail-review-heading">
            <h2>
              Cảm nhận từ bạn đọc <span>({b.reviews_count})</span>
            </h2>
            {b.rating && (
              <strong>
                <Star size={18} fill="currentColor" />
                {b.rating}
                <small>/5</small>
              </strong>
            )}
          </div>
          <ReviewDistribution book={b} />
          {b.reviews?.length ? (
            b.reviews.map((r: any) => (
              <div className="review" key={r.id}>
                <span className="avatar">{r.user?.name[0]}</span>
                <div>
                  <strong>{r.user?.name}</strong>
                  <div className="review-stars">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={12} fill={i < r.rating ? 'currentColor' : 'none'} />
                    ))}
                  </div>
                  <p>{r.comment}</p>
                </div>
                <small>{date(r.created_at)}</small>
              </div>
            ))
          ) : (
            <Empty
              title="Hãy là người chia sẻ cảm nhận đầu tiên"
              description="Bạn có thể đánh giá sau khi mượn và trả cuốn sách này."
            />
          )}
          {canReview && (
            <form
              className="review-form"
              onSubmit={(e) => {
                e.preventDefault()
                task.mutate(
                  { url: '/books/' + b.id + '/review', method: 'put', data: { rating, comment } },
                  { onSuccess: () => setComment('') },
                )
              }}
            >
              <h3>Chia sẻ góc nhìn của bạn</h3>
              <div className="star-picker">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    type="button"
                    aria-label={v + ' sao'}
                    onClick={() => setRating(v)}
                    key={v}
                  >
                    <Star size={23} fill={rating >= v ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
                minLength={5}
                maxLength={2000}
                placeholder="Điều gì trong cuốn sách đã ở lại với bạn?"
              />
              <Button disabled={task.isPending} size="sm">
                <Send size={15} />
                Gửi đánh giá
              </Button>
            </form>
          )}
        </section>
        <BookDetailSidebar book={b} settings={settings?.data} />
      </div>
      <section className="related-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">TIẾP NỐI SỰ TÒ MÒ</span>
            <h2>Có thể bạn cũng thích</h2>
          </div>
          <Link className="text-link" to="/catalog">
            Khám phá thêm
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="book-grid">
          {related.data?.data
            .filter((v: Book) => v.id !== b.id)
            .slice(0, 4)
            .map((v: Book) => (
              <BookCard key={v.id} book={v} />
            ))}
        </div>
      </section>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title={borrow ? 'Gửi yêu cầu mượn sách' : 'Tham gia hàng chờ đặt trước'}
        description={
          borrow
            ? 'Nhân viên sẽ kiểm tra điều kiện và thông báo khi sách sẵn sàng để nhận.'
            : 'Thư viện sẽ giữ sách cho người đủ điều kiện theo thứ tự đặt trước.'
        }
      >
        <div className="confirm-book">
          <Cover book={b} />
          <div>
            <strong>{b.title}</strong>
            <p>{b.authors[0]?.name}</p>
            <small>
              {borrow
                ? 'Thời hạn mượn bắt đầu khi bạn nhận sách.'
                : 'Bạn sẽ nhận thông báo khi có bản sao khả dụng.'}
            </small>
          </div>
        </div>
        <div className="modal-actions">
          <Button variant="outline" onClick={() => setConfirm(false)}>
            Quay lại
          </Button>
          <Button
            disabled={task.isPending}
            onClick={() =>
              task.mutate(
                { url: borrow ? '/loan-requests' : '/reservations', data: { book_id: b.id } },
                { onSuccess: () => setConfirm(false) },
              )
            }
          >
            {task.isPending ? 'Đang gửi…' : borrow ? 'Xác nhận yêu cầu' : 'Xác nhận đặt trước'}
            <ArrowRight size={15} />
          </Button>
        </div>
      </Modal>
    </div>
  )
}
