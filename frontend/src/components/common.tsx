import { useEffect, useState, type ReactNode } from 'react'
import { motion, animate, useMotionValue, useTransform, useReducedMotion } from 'motion/react'
import {
  BookOpen,
  ArrowRight,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Heart,
  Star,
  AlertCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { get } from '../lib/api'
import { useAuth, useTask } from '../app/auth'
import { Button } from './ui/button'
import { BrandMark } from './ui/brand-mark'
import type { Book } from '../types'
import { statusLabel } from '../lib/utils'
export function Logo({ compact = false }: { compact?: boolean }) {
  const { data } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => get('/public/settings'),
  })
  const logo = data?.data?.logo
  return (
    <Link to="/" className="logo" aria-label="LIBRIVO — Trang chủ">
      <span className="logo-mark brand-mark">
        {logo ? <img src={logo} alt="Logo thư viện" /> : <BrandMark />}
      </span>
      {!compact && (
        <span className="logo-wordmark">
          libri<span className="brand-word-accent">vo</span>
          <i className="brand-punctuation" aria-hidden="true" />
        </span>
      )}
    </Link>
  )
}
export function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      data-reveal
      className={className}
      initial={{ y: 18 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.4, delay }}
    >
      {children}
    </motion.div>
  )
}
export function Counter({ value }: { value: number }) {
  const reduced = useReducedMotion()
  const n = useMotionValue(0)
  const rounded = useTransform(n, (v) => Math.round(v).toLocaleString('vi-VN'))
  useEffect(() => {
    if (reduced) {
      n.set(value)
      return
    }
    const c = animate(n, value, { duration: 0.75 })
    return c.stop
  }, [value, n, reduced])
  return <motion.span>{rounded}</motion.span>
}
export function Cover({
  book,
  className = '',
  priority = false,
}: {
  book: Pick<Book, 'title' | 'authors' | 'cover' | 'id'>
  className?: string
  priority?: boolean
}) {
  const [broken, setBroken] = useState(false)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    setBroken(false)
    setLoaded(false)
  }, [book.cover])
  const colors = ['#d5b87c', '#2b5c4f', '#bc795b', '#717895', '#b1bbc2', '#af8f99']
  return (
    <div
      className={'book-cover ' + className}
      style={{ '--cover-color': colors[book.id % colors.length] } as React.CSSProperties}
    >
      {(!book.cover || broken || !loaded) && (
        <div className="cover-fallback">
          <small>THE LIBRIVO COLLECTION</small>
          <BookOpen size={30} strokeWidth={1} />
          <strong>{book.title}</strong>
          <span>
            {book.authors
              ?.map((a) => a.name)
              .slice(0, 2)
              .join(' · ')}
          </span>
          <i>LIBRIVO EDITION</i>
        </div>
      )}
      {book.cover && !broken && (
        <img
          src={book.cover}
          alt={'Bìa sách ' + book.title}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setLoaded(true)}
          onError={() => setBroken(true)}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: loaded ? 1 : 0,
            transition: 'opacity .2s',
          }}
        />
      )}
    </div>
  )
}
export function BookCard({ book, index = 0 }: { book: Book; index?: number }) {
  const { user, requestLogin } = useAuth()
  const task = useTask()
  const { data } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => get('/favorites'),
    enabled: !!user,
  })
  const saved = data?.data?.includes(book.id)
  return (
    <motion.article
      layout
      className="book-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.035 }}
      whileHover={{ y: -5 }}
    >
      <div className="book-art">
        <Link to={'/books/' + book.id} aria-label={'Xem ' + book.title}>
          <Cover book={book} />
        </Link>
        <button
          className={'heart-btn ' + (saved ? 'saved' : '')}
          title={saved ? 'Bỏ yêu thích' : 'Lưu yêu thích'}
          aria-label={(saved ? 'Bỏ lưu ' : 'Lưu ') + book.title}
          disabled={task.isPending}
          onClick={() =>
            user
              ? task.mutate({
                  url: '/favorites/' + book.id,
                  method: 'put',
                  data: { saved: !saved },
                })
              : requestLogin()
          }
        >
          <Heart size={17} fill={saved ? 'currentColor' : 'none'} />
        </button>
        {book.featured && <span className="book-pick">TUYỂN CHỌN</span>}
      </div>
      <div className="book-card-meta">
        <span>{book.categories?.[0]?.name || 'Bộ sưu tập'}</span>
        {book.rating && (
          <span className="rating">
            <Star size={12} fill="currentColor" />
            {book.rating}
          </span>
        )}
      </div>
      <Link className="book-title" to={'/books/' + book.id}>
        {book.title}
      </Link>
      <p className="book-author">
        {book.authors
          ?.map((a) => a.name)
          .slice(0, 2)
          .join(', ') || 'Chưa cập nhật tác giả'}
      </p>
      <div className="book-card-bottom">
        <span className={'availability ' + (!book.available_count ? 'out' : '')}>
          <i />
          {book.available_count ? 'Có sẵn · ' + book.available_count + ' bản' : 'Đang được mượn'}
        </span>
        <Link to={'/books/' + book.id} aria-label={'Chi tiết ' + book.title}>
          <ArrowRight size={16} />
        </Link>
      </div>
    </motion.article>
  )
}
export function Badge({ status }: { status: string }) {
  return <span className={'badge badge-' + status}>{statusLabel[status] || status}</span>
}
export function Empty({
  title = 'Chưa có dữ liệu',
  description = 'Những câu chuyện mới đang chờ bạn khám phá.',
  action,
}: {
  title?: string
  description?: string
  action?: ReactNode
}) {
  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="empty-icon">
        <BookOpen size={28} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </motion.div>
  )
}
export function ErrorState({ retry }: { retry?: () => void }) {
  return (
    <div className="empty-state error-state">
      <AlertCircle size={30} />
      <h3>Chưa thể tải dữ liệu</h3>
      <p>Vui lòng kiểm tra kết nối với thư viện và thử lại.</p>
      <Button variant="outline" onClick={retry}>
        <RefreshCw size={16} />
        Thử lại
      </Button>
    </div>
  )
}
export function Skeleton({ cards = false }: { cards?: boolean }) {
  return cards ? (
    <div className="book-grid">
      {Array.from({ length: 8 }, (_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton skeleton-cover" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
      ))}
    </div>
  ) : (
    <div className="loading-block">
      {[1, 2, 3, 4].map((v) => (
        <div className="skeleton skeleton-row" key={v} />
      ))}
    </div>
  )
}
export function Pagination({
  page,
  last,
  total,
  onChange,
}: {
  page: number
  last: number
  total: number
  onChange: (n: number) => void
}) {
  return (
    <div className="pagination">
      <span>
        {total.toLocaleString('vi-VN')} kết quả · Trang {page}/{Math.max(1, last)}
      </span>
      <div>
        <Button
          variant="outline"
          size="icon"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Trang trước"
        >
          <ChevronLeft size={17} />
        </Button>
        {Array.from({ length: Math.min(last, 5) }, (_, i) => {
          const n = Math.max(1, Math.min(page - 2, last - 4)) + i
          return (
            <button className={page === n ? 'page-active' : ''} key={n} onClick={() => onChange(n)}>
              {n}
            </button>
          )
        })}
        <Button
          variant="outline"
          size="icon"
          disabled={page >= last}
          onClick={() => onChange(page + 1)}
          aria-label="Trang tiếp"
        >
          <ChevronRight size={17} />
        </Button>
      </div>
    </div>
  )
}
export function SearchInput({
  value,
  onChange,
  placeholder = 'Tìm kiếm…',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="search-input">
      <Search size={17} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button onClick={() => onChange('')} aria-label="Xóa tìm kiếm">
          ×
        </button>
      )}
    </div>
  )
}
export function useDebounce<T>(value: T, delay = 350) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}
export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </div>
  )
}
