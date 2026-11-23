import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import {
  Search,
  ArrowRight,
  ArrowUpRight,
  ArrowLeft,
  BookOpen,
  Sparkles,
  Code2,
  Brain,
  BriefcaseBusiness,
  FlaskConical,
  Palette,
  Globe,
  Heart,
  Quote,
  Bookmark,
  Check,
  Flower2,
  LibraryBig,
} from 'lucide-react'
import { get } from '../lib/api'
import { Cover, BookCard, Counter, Reveal, Skeleton, ErrorState } from '../components/common'
import { Button } from '../components/ui/button'
import { useAuth } from '../app/auth'
import type { Book, Page, Taxon } from '../types'
import { HomeCollections, HomeReadingJourney, HomeQuestions } from '../components/books/HomeContent'
const categoryIcons = [
  Code2,
  Brain,
  BriefcaseBusiness,
  BookOpen,
  FlaskConical,
  Palette,
  Globe,
  Flower2,
]
export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const shelf = useRef<HTMLDivElement>(null)
  const books = useQuery({
    queryKey: ['home-books', sort],
    queryFn: () => get<Page<Book>>('/books', { per_page: 8, sort }),
  })
  const featured = useQuery({
    queryKey: ['hero-books'],
    queryFn: () => get<Page<Book>>('/books', { featured: true, per_page: 12, sort: 'popular' }),
  })
  const { data: stats } = useQuery({
    queryKey: ['public-stats'],
    queryFn: () => get('/public/stats'),
  })
  const categories = useQuery({
    queryKey: ['taxonomy', 'categories'],
    queryFn: () => get<{ data: Taxon[] }>('/taxonomy/categories'),
  })
  const authors = useQuery({
    queryKey: ['taxonomy', 'authors'],
    queryFn: () => get('/taxonomy/authors'),
  })
  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => get('/public/settings'),
  })
  const hero = featured.data?.data.filter((b) => b.cover).slice(0, 3) || []
  const best = featured.data?.data.slice(0, 6) || []
  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <motion.div className="hero-eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <span className="live-dot" />
              KHÔNG GIAN CHO NHỮNG TÂM HỒN TÒ MÒ
              <ArrowUpRight size={13} />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Mở một trang sách.
              <br />
              Mở cả <em>thế giới.</em>
              <svg className="hero-underline" viewBox="0 0 300 15">
                <path
                  d="M3 10 Q140 -1 296 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
            >
              Từ những câu chuyện chạm đến trái tim đến những ý tưởng thay đổi cuộc sống. Cuốn sách
              tiếp theo của bạn đang ở đây.
            </motion.p>
            <form
              className="hero-search"
              onSubmit={(e) => {
                e.preventDefault()
                navigate('/catalog?search=' + encodeURIComponent(search))
              }}
            >
              <Search size={21} />
              <input
                placeholder="Bạn muốn khám phá điều gì hôm nay?"
                aria-label="Tìm sách trên trang chủ"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button aria-label="Tìm sách">
                <ArrowRight size={20} />
              </button>
            </form>
            <div className="trending-search">
              <span>Được tìm nhiều:</span>
              {['Atomic Habits', 'Tâm lý học', 'Lập trình'].map((s, i) => (
                <Link
                  key={s}
                  to={
                    i === 0
                      ? '/catalog?search=Atomic%20Habits'
                      : '/catalog?category=' +
                        (categories.data?.data.find((c) => c.name === s)?.id || '')
                  }
                >
                  {s}
                </Link>
              ))}
            </div>
            <div className="hero-community">
              <div className="avatar-stack">
                {['MA', 'NC', 'HL', 'AK'].map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
              <div>
                <strong>{stats?.data?.members || '…'} người bạn yêu sách</strong>
                <span>
                  Cùng nhau viết tiếp hành trình tri thức
                  <Heart size={11} />
                </span>
              </div>
              <div className="community-divider" />
              <BookOpen size={24} strokeWidth={1.3} />
              <div>
                <strong>{stats?.data?.books || '…'} đầu sách</strong>
                <span>Vô vàn góc nhìn</span>
              </div>
            </div>
          </div>
          <div className="hero-showcase">
            <div className="hero-circle outer" />
            <div className="hero-circle inner" />
            <span className="hero-spark spark-1">✧</span>
            <span className="hero-spark spark-2">✦</span>
            <div className="hero-small-label">
              <span />A LITTLE CURIOSITY GOES A LONG WAY
            </div>
            <div className="hero-books">
              {hero.map((b, i) => (
                <motion.div
                  key={b.id}
                  className={'hero-book hero-book-' + i}
                  initial={{ opacity: 0, y: 35, rotate: i === 0 ? -13 : i === 2 ? 14 : -4 }}
                  animate={{ opacity: 1, y: 0, rotate: i === 0 ? -13 : i === 2 ? 14 : -4 }}
                  transition={{ duration: 0.6, delay: i * 0.12 }}
                  whileHover={{ y: -12, rotate: 0 }}
                >
                  <Link to={'/books/' + b.id}>
                    <Cover book={b} priority />
                  </Link>
                </motion.div>
              ))}
              {featured.isPending && <div className="skeleton hero-cover-skeleton" />}
            </div>
            <motion.div
              className="hero-float-note"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 }}
            >
              <span>
                <Bookmark size={20} />
              </span>
              <div>
                <strong>Cuốn sách hay. Đúng thời điểm.</strong>
                <small>Một khởi đầu cho những điều lớn lao.</small>
              </div>
            </motion.div>
            <div className="hero-caption">
              <span>CURATED WITH CURIOSITY</span>
              <svg width="68" height="33" viewBox="0 0 68 33">
                <path
                  d="M2 8 Q45 40 61 4 M48 7 L62 3 L63 18"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  fill="none"
                />
              </svg>
            </div>
          </div>
        </div>
      </section>
      <div className="trust-strip">
        <div className="container">
          <span>
            <LibraryBig size={18} />
            Thư viện mở, tri thức không giới hạn
          </span>
          <span>
            <Check size={17} />
            Mượn sách dễ dàng
          </span>
          <span>
            <Heart size={17} />
            Tuyển chọn bằng sự tận tâm
          </span>
          <span>
            <Globe size={17} />
            Kết nối cộng đồng yêu sách
          </span>
        </div>
      </div>
      <section className="section container category-section">
        <Reveal className="section-heading">
          <div>
            <span className="eyebrow">ĐI THEO SỰ TÒ MÒ CỦA BẠN</span>
            <h2>
              Bạn muốn khám phá <em>điều gì?</em>
            </h2>
          </div>
          <Link className="text-link" to="/categories">
            Tất cả danh mục
            <ArrowUpRight size={16} />
          </Link>
        </Reveal>
        <div className="home-categories">
          {categories.data?.data
            .filter((c) => c.books_count)
            .slice(0, 8)
            .map((c, i) => {
              const Icon = categoryIcons[i % categoryIcons.length]
              return (
                <Reveal key={c.id} delay={i * 0.035}>
                  <Link
                    to={'/catalog?category=' + c.id}
                    className="category-tile"
                    style={{ '--category-color': c.color } as React.CSSProperties}
                  >
                    <span className="category-icon">
                      <Icon size={23} strokeWidth={1.6} />
                    </span>
                    <strong>{c.name}</strong>
                    <small>
                      {c.books_count} đầu sách
                      <ArrowUpRight size={12} />
                    </small>
                  </Link>
                </Reveal>
              )
            })}
        </div>
      </section>
      <section className="section container books-section">
        <Reveal className="section-heading">
          <div>
            <span className="eyebrow">MỖI CUỐN SÁCH, MỘT CUỘC GẶP GỠ</span>
            <h2>
              Tìm cuốn sách <em>dành cho bạn.</em>
            </h2>
          </div>
          <Link to="/catalog" className="text-link">
            Khám phá thư viện
            <ArrowUpRight size={16} />
          </Link>
        </Reveal>
        <div className="section-tabs">
          <div>
            {[
              ['newest', 'Mới trên kệ sách'],
              ['popular', 'Được mượn nhiều'],
              ['rating', 'Được đánh giá cao'],
            ].map(([v, l]) => (
              <button className={sort === v ? 'active' : ''} key={v} onClick={() => setSort(v)}>
                {v === 'newest' && <Sparkles size={15} />} {l}
                {sort === v && <motion.span layoutId="home-tab" className="tab-indicator" />}
              </button>
            ))}
          </div>
          <span className="muted">Tuyển chọn cho những trang tiếp theo</span>
        </div>
        {books.isPending ? (
          <Skeleton cards />
        ) : books.isError ? (
          <ErrorState retry={() => books.refetch()} />
        ) : (
          <div className="book-grid home-book-grid">
            {books.data?.data.map((b, i) => (
              <BookCard key={b.id} book={b} index={i} />
            ))}
          </div>
        )}
        <div className="center-action">
          <Button variant="outline" asChild>
            <Link to="/catalog">
              Xem tất cả sách
              <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
      </section>
      <HomeCollections
        categories={categories.data?.data || []}
        spotlight={
          featured.data?.data.find((b) => b.title === 'The Pragmatic Programmer') ||
          featured.data?.data[0]
        }
      />
      <section className="editorial-section">
        <div className="container editorial-inner">
          <Reveal className="editorial-copy">
            <span className="eyebrow">
              <span className="tiny-dot" /> THE LIBRIVO EDIT
            </span>
            <h2>
              Những cuốn sách
              <br />
              xứng đáng có mặt
              <br />
              trên <em>kệ sách của bạn.</em>
            </h2>
            <p>
              Một chút cảm hứng, một góc nhìn mới.
              <br />
              Khám phá bộ sưu tập được chúng tôi tuyển chọn
              <br />
              cho hành trình phát triển của riêng bạn.
            </p>
            <Button asChild>
              <Link to="/catalog?featured=1">
                Khám phá bộ sưu tập
                <ArrowUpRight size={16} />
              </Link>
            </Button>
            <div className="editorial-arrows">
              <button
                onClick={() => shelf.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                aria-label="Sách trước"
              >
                <ArrowLeft size={18} />
              </button>
              <button
                onClick={() => shelf.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                aria-label="Sách tiếp"
              >
                <ArrowRight size={18} />
              </button>
              <span>TỦ SÁCH TRUYỀN CẢM HỨNG</span>
            </div>
          </Reveal>
          <div className="editorial-shelf" ref={shelf}>
            {best.map((b, i) => (
              <Link to={'/books/' + b.id} key={b.id} className="editorial-book">
                <span className="editorial-number">0{i + 1}</span>
                <Cover book={b} priority />
                <strong>{b.title}</strong>
                <span>{b.authors[0]?.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <HomeReadingJourney settings={settings?.data} user={!!user} />
      <section id="about" className="section container about-section">
        <Reveal>
          <span className="eyebrow">NƠI TRI THỨC GẶP GỠ CỘNG ĐỒNG</span>
          <h2>
            Hơn một thư viện.
            <br />
            Một không gian <em>để lớn lên.</em>
          </h2>
          <p>{settings?.data?.about}</p>
          <div className="about-benefits">
            <span>
              <Check size={16} />
              Mượn sách thuận tiện, quản lý trực tuyến
            </span>
            <span>
              <Check size={16} />
              Tìm cảm hứng từ nhiều lĩnh vực
            </span>
            <span>
              <Check size={16} />
              Cộng đồng cùng chia sẻ tình yêu tri thức
            </span>
          </div>
          <div className="about-stats">
            {[
              [stats?.data?.books, 'Đầu sách tuyển chọn'],
              [stats?.data?.members, 'Thành viên yêu sách'],
              [stats?.data?.categories, 'Lĩnh vực khám phá'],
            ].map(([n, l]) => (
              <div key={String(l)}>
                <strong>
                  <Counter value={Number(n) || 0} />
                  <span>+</span>
                </strong>
                <small>{l}</small>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal className="quote-card">
          <Quote size={37} strokeWidth={1} />
          <blockquote>
            Không có người bạn nào
            <br />
            trung thành như
            <br />
            <em>một cuốn sách.</em>
          </blockquote>
          <div className="quote-attribution">
            <span className="quote-line" />
            <span>ERNEST HEMINGWAY</span>
          </div>
          <div className="quote-decoration">
            <BookOpen size={110} strokeWidth={0.5} />
            <span>✧</span>
          </div>
        </Reveal>
      </section>
      <section className="container authors-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">PHÍA SAU NHỮNG TRANG SÁCH</span>
            <h2>Những người kể chuyện.</h2>
          </div>
          <Link to="/catalog" className="text-link">
            Tìm tác giả yêu thích
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="authors-row">
          {authors.data?.data
            .filter((a: any) => a.books_count > 0)
            .sort((a: any, b: any) => b.books_count - a.books_count)
            .slice(0, 5)
            .map((a: any, i: number) => (
              <Link
                to={'/catalog?search=' + encodeURIComponent(a.name)}
                className="author-tile"
                key={a.id}
              >
                <div className={'author-initial author-color-' + i}>
                  {a.name
                    .split(' ')
                    .map((s: string) => s[0])
                    .slice(0, 2)
                    .join('')}
                  <span>
                    <ArrowUpRight size={14} />
                  </span>
                </div>
                <strong>{a.name}</strong>
                <small>{a.books_count} tác phẩm trong thư viện</small>
              </Link>
            ))}
        </div>
      </section>
      <HomeQuestions settings={settings?.data} />
      <section className="container cta-section">
        <Reveal className="cta-inner">
          <div className="cta-doodle">
            <BookOpen size={58} strokeWidth={1} />
            <span>✧</span>
          </div>
          <div>
            <span className="eyebrow">CHƯƠNG TIẾP THEO ĐANG CHỜ BẠN</span>
            <h2>Hành trình hay, bắt đầu từ một cuốn sách.</h2>
            <p>Tham gia LIBRIVO và tìm cuốn sách tiếp theo của riêng mình.</p>
          </div>
          <Button asChild>
            <Link to={user ? '/catalog' : '/register'}>
              {user ? 'Khám phá ngay' : 'Trở thành thành viên'}
              <ArrowUpRight size={17} />
            </Link>
          </Button>
        </Reveal>
      </section>
    </>
  )
}
