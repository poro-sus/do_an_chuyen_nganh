import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Compass,
  Copy,
  FileText,
  Lightbulb,
  MapPin,
  Share2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Book } from '../../types'
import { Button } from '../ui/button'

export function BookReadingContent({ book: b }: { book: Book }) {
  const e = b.editorial
  const introductions = e?.introduction?.length
    ? e.introduction
    : (b.description || b.summary || 'Thông tin giới thiệu đang được thư viện bổ sung.').split(
        /\n\s*\n/,
      )
  const guide = e?.reading_guide?.length
    ? e.reading_guide
    : [
        {
          title: 'Bắt đầu với một câu hỏi',
          description:
            'Bạn tìm đến cuốn sách này vì điều gì? Ghi lại một câu hỏi hoặc một chủ đề mà bạn muốn khám phá trước khi bắt đầu.',
        },
        {
          title: 'Đọc theo nhịp của riêng bạn',
          description:
            'Chọn một khoảng thời gian phù hợp. Đánh dấu bằng bookmark và ghi chú riêng những đoạn khiến bạn muốn dừng lại suy nghĩ.',
        },
        {
          title: 'Giữ lại một điều có ý nghĩa',
          description:
            'Khi khép sách, viết vài dòng về điều bạn muốn nhớ. Bạn có thể chia sẻ cảm nhận với cộng đồng sau khi hoàn tất lượt mượn.',
        },
      ]
  return (
    <>
      <section id="book-overview" className="book-content-section">
        <span className="eyebrow">MỘT CÁI NHÌN TRƯỚC KHI MỞ SÁCH</span>
        <h2>Về cuốn sách này</h2>
        {e?.headline && <p className="editorial-lead">{e.headline}</p>}
        <div className="editorial-prose">
          {introductions.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        {e?.edition_note && (
          <div className="edition-context">
            <FileText size={19} />
            <p>{e.edition_note}</p>
          </div>
        )}
      </section>
      {e?.topics?.length ? (
        <section id="book-topics" className="book-content-section">
          <div className="content-section-label">
            <Compass size={19} />
            <span>BÊN TRONG NHỮNG TRANG SÁCH</span>
          </div>
          <h2>Những chủ đề bạn sẽ gặp</h2>
          <p className="content-intro">
            Những hướng nội dung nổi bật để bạn hình dung cuốn sách trước khi lựa chọn.
          </p>
          <div className="book-topics-grid">
            {e.topics.map((t, i) => (
              <article key={i}>
                <span className="topic-number">{String(i + 1).padStart(2, '0')}</span>
                <h3>{t.title}</h3>
                <p>{t.description}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {e?.takeaways?.length ? (
        <section className="book-content-section takeaways-section">
          <div className="content-section-label">
            <Lightbulb size={19} />
            <span>MANG THEO SAU KHI KHÉP SÁCH</span>
          </div>
          <h2>Thêm một góc nhìn cho bạn</h2>
          <ul className="book-takeaways">
            {e.takeaways.map((t, i) => (
              <li key={i}>
                <span>
                  <Check size={15} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {e?.audience?.length ? (
        <section className="book-content-section">
          <div className="content-section-label">
            <Users size={19} />
            <span>TÌM ĐÚNG CUỐN SÁCH, ĐÚNG LÚC</span>
          </div>
          <h2>Cuốn sách này dành cho ai?</h2>
          <div className="book-audience">
            {e.audience.map((a, i) => (
              <div key={i}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <p>{a}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <section id="book-reading-guide" className="book-content-section">
        <div className="content-section-label">
          <BookOpen size={19} />
          <span>GỢI Ý ĐỌC TỪ LIBRIVO</span>
        </div>
        <h2>Để mỗi lần đọc đều có ý nghĩa</h2>
        <p className="content-intro">
          Một cách đồng hành với cuốn sách. Bạn có thể điều chỉnh theo mục đích và trải nghiệm của
          mình.
        </p>
        <div className="reading-guide-steps">
          {guide.map((g, i) => (
            <div key={i}>
              <span>{i + 1}</span>
              <div>
                <h3>{g.title}</h3>
                <p>{g.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section id="book-authors" className="book-content-section">
        <span className="eyebrow">PHÍA SAU NHỮNG TRANG SÁCH</span>
        <h2>Gặp gỡ tác giả</h2>
        <div className="detail-author-cards">
          {b.authors.map((a) => {
            const note = e?.author_notes?.find((n) => n.name === a.name)?.note
            return (
              <article key={a.id}>
                <div className="author-monogram">
                  {a.name
                    .split(' ')
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <h3>{a.name}</h3>
                  <p>
                    {a.bio ||
                      note ||
                      `Tác giả của ${b.title}. Khám phá thêm những tác phẩm của tác giả đang có trong bộ sưu tập LIBRIVO.`}
                  </p>
                  <Link className="text-link" to={'/catalog?search=' + encodeURIComponent(a.name)}>
                    Tìm sách của tác giả
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      </section>
      <section id="book-edition" className="book-content-section">
        <span className="eyebrow">THÔNG TIN CỦA BẢN SÁCH TẠI THƯ VIỆN</span>
        <h2>Thông tin ấn bản</h2>
        <dl className="edition-table">
          {[
            ['Tên sách', b.title],
            ['Tác giả', b.authors.map((a) => a.name).join(', ')],
            ['ISBN', b.isbn || 'Chưa được cập nhật'],
            ['Nhà xuất bản', b.publisher?.name || 'Chưa được cập nhật'],
            ['Năm xuất bản', b.year || 'Chưa được cập nhật'],
            ['Ngôn ngữ', b.language],
            ['Số trang', b.pages ? `${b.pages} trang` : 'Chưa được cập nhật'],
            ['Danh mục', b.categories.map((c) => c.name).join(' · ')],
            ['Bản sao tại thư viện', `${b.copies_count} bản · ${b.available_count} bản khả dụng`],
            ['Vị trí', b.shelves?.map((s) => s.name).join(' · ') || 'Liên hệ quầy thư viện'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="edition-actions">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              copyText(
                `${b.authors.map((a) => a.name).join(', ')}. ${b.title}.${b.year ? ' ' + b.year + '.' : ''}${b.publisher ? ' ' + b.publisher.name + '.' : ''}${b.isbn ? ' ISBN: ' + b.isbn + '.' : ''}`,
                'Đã sao chép thông tin sách',
              )
            }
          >
            <Copy size={14} />
            Sao chép thông tin
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              copyText(window.location.origin + '/books/' + b.id, 'Đã sao chép liên kết cuốn sách')
            }
          >
            <Share2 size={14} />
            Chia sẻ cuốn sách
          </Button>
        </div>
        {(e?.sources?.length || b.source) && (
          <div className="book-sources">
            <span>Đọc thêm từ nguồn xuất bản và thư mục</span>
            {e?.sources?.length ? (
              e.sources.map((s) => (
                <a href={s.url} target="_blank" rel="noreferrer" key={s.url}>
                  {s.title}
                  <ArrowUpRight size={13} />
                </a>
              ))
            ) : (
              <a href={b.source} target="_blank" rel="noreferrer">
                Bản ghi thông tin sách
                <ArrowUpRight size={13} />
              </a>
            )}
          </div>
        )}
      </section>
    </>
  )
}
async function copyText(text: string, message: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(message)
  } catch {
    toast.error('Chưa thể sao chép. Vui lòng thử lại trên trình duyệt.')
  }
}

export function BookDetailSidebar({
  book,
  settings,
}: {
  book: Book
  settings?: Record<string, string>
}) {
  return (
    <aside className="detail-reading-sidebar">
      <div className="detail-navigation-card">
        <span className="eyebrow">TRONG TRANG SÁCH NÀY</span>
        <h3>Bạn muốn tìm hiểu gì?</h3>
        <nav aria-label="Nội dung chi tiết sách">
          {[
            ['book-overview', 'Giới thiệu cuốn sách'],
            ...(book.editorial?.topics?.length ? [['book-topics', 'Chủ đề nổi bật']] : []),
            ['book-reading-guide', 'Gợi ý cách đọc'],
            ['book-authors', 'Về tác giả'],
            ['book-edition', 'Thông tin ấn bản'],
            ['book-reviews', 'Cảm nhận bạn đọc'],
          ].map(([id, label], i) => (
            <a key={id} href={'#' + id}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              {label}
              <ArrowUpRight size={13} />
            </a>
          ))}
        </nav>
      </div>
      <div className="detail-borrow-guide">
        <span className="detail-note-symbol">✧</span>
        <h3>Mang câu chuyện về nhà.</h3>
        <p>Gửi yêu cầu trực tuyến và nhận sách khi thư viện xác nhận sẵn sàng.</p>
        {settings && (
          <ul>
            <li>
              <BookOpen size={16} />
              <span>
                Tối đa <strong>{settings.max_books} cuốn</strong> cùng lúc
              </span>
            </li>
            <li>
              <Compass size={16} />
              <span>
                Mỗi lượt mượn <strong>{settings.loan_days} ngày</strong>
              </span>
            </li>
            <li>
              <MapPin size={16} />
              <span>Nhận và trả tại quầy thư viện</span>
            </li>
          </ul>
        )}
        <Link className="text-link" to="/policy">
          Xem chính sách mượn sách
          <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="book-care-card">
        <BookOpen size={25} strokeWidth={1.2} />
        <h3>Giữ gìn cho người đọc tiếp theo.</h3>
        <p>
          Dùng bookmark thay vì gấp trang, giữ sách khô ráo và ghi chú trên giấy riêng. Một việc nhỏ
          để câu chuyện được đi xa hơn.
        </p>
      </div>
    </aside>
  )
}

export function ReviewDistribution({ book }: { book: Book }) {
  return (
    <div className="review-distribution">
      <div className="review-score">
        {book.rating ? (
          <>
            <strong>
              {book.rating}
              <small>/5</small>
            </strong>
            <div className="review-stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n}>{n <= Math.round(book.rating || 0) ? '★' : '☆'}</span>
              ))}
            </div>
            <span>{book.reviews_count} đánh giá từ bạn đọc</span>
          </>
        ) : (
          <>
            <BookOpen size={30} />
            <span>Chưa có đánh giá</span>
          </>
        )}
      </div>
      <div className="review-rating-bars">
        {[5, 4, 3, 2, 1].map((r) => {
          const count = Number(
            book.review_distribution?.find((d) => Number(d.rating) === r)?.count || 0,
          )
          return (
            <div key={r}>
              <span>
                {r} <span>★</span>
              </span>
              <div>
                <i
                  style={{
                    width: (book.reviews_count ? (count / book.reviews_count) * 100 : 0) + '%',
                  }}
                />
              </div>
              <small>{count}</small>
            </div>
          )
        })}
      </div>
      <p>Chỉ thành viên đã mượn và trả cuốn sách mới có thể gửi đánh giá.</p>
    </div>
  )
}
