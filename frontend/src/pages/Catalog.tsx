import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  SlidersHorizontal,
  LayoutGrid,
  List,
  ArrowRight,
  X,
  BookOpen,
  ArrowUpRight,
} from 'lucide-react'
import { get } from '../lib/api'
import {
  BookCard,
  PageHeading,
  SearchInput,
  useDebounce,
  Skeleton,
  ErrorState,
  Empty,
  Pagination,
  Cover,
} from '../components/common'
import { Button } from '../components/ui/button'
import type { Book, Page, Taxon } from '../types'
export default function Catalog({ favorites = false }: { favorites?: boolean }) {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('search') || '')
  const debounced = useDebounce(search)
  const [view, setView] = useState('grid')
  const [filters, setFilters] = useState(false)
  const category = params.get('category') || ''
  const sort = params.get('sort') || 'newest'
  const language = params.get('language') || ''
  const available = params.get('available') === '1'
  const update = (k: string, v: string) => {
    setParams((p) => {
      v ? p.set(k, v) : p.delete(k)
      if (k !== 'page') p.delete('page')
      return p
    })
  }
  useEffect(() => {
    if (debounced !== params.get('search') && !(debounced === '' && !params.get('search')))
      update('search', debounced)
  }, [debounced])
  const query = useQuery({
    queryKey: ['books', params.toString(), favorites],
    queryFn: () =>
      get<Page<Book>>('/books', {
        ...Object.fromEntries(params),
        favorites: favorites ? 1 : undefined,
        per_page: 12,
      }),
  })
  const cats = useQuery({
    queryKey: ['taxonomy', 'categories'],
    queryFn: () => get<{ data: Taxon[] }>('/taxonomy/categories'),
  })
  const publishers = useQuery({
    queryKey: ['taxonomy', 'publishers'],
    queryFn: () => get('/taxonomy/publishers'),
  })
  return (
    <div className={favorites ? '' : 'container catalog-page'}>
      {!favorites && (
        <div className="catalog-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span>/</span>Thư viện sách
        </div>
      )}
      <PageHeading
        eyebrow={favorites ? 'DÀNH RIÊNG CHO BẠN' : 'MỘT THẾ GIỚI ĐỂ KHÁM PHÁ'}
        title={favorites ? 'Tủ sách yêu thích' : 'Tìm câu chuyện tiếp theo.'}
        description={
          favorites
            ? 'Những cuốn sách bạn muốn dành thời gian khám phá.'
            : 'Mỗi cuốn sách là một cánh cửa. Bạn muốn mở cánh cửa nào hôm nay?'
        }
        actions={
          !favorites && (
            <span className="catalog-total">
              <BookOpen size={19} />
              {query.data?.meta?.total ?? '…'} đầu sách đang chờ bạn
            </span>
          )
        }
      />
      <div className="catalog-layout">
        <aside className={'catalog-filters ' + (filters ? 'filters-open' : '')}>
          <div className="filter-title">
            <h3>
              <SlidersHorizontal size={17} />
              Bộ lọc tìm kiếm
            </h3>
            <button
              onClick={() => {
                setParams({})
                setSearch('')
              }}
            >
              Đặt lại
            </button>
          </div>
          <div className="filter-group">
            <h4>Danh mục sách</h4>
            <button
              className={'category-filter ' + (!category ? 'selected' : '')}
              onClick={() => update('category', '')}
            >
              <span>Tất cả danh mục</span>
              <small>{cats.data?.data.reduce((n, c) => n + (c.books_count || 0), 0)}</small>
            </button>
            {cats.data?.data.map((c) => (
              <button
                key={c.id}
                className={'category-filter ' + (category === String(c.id) ? 'selected' : '')}
                onClick={() => update('category', String(c.id))}
              >
                <span>{c.name}</span>
                <small>{c.books_count}</small>
              </button>
            ))}
          </div>
          <div className="filter-group">
            <h4>Ngôn ngữ</h4>
            {[
              ['', 'Tất cả ngôn ngữ'],
              ['Tiếng Việt', 'Tiếng Việt'],
              ['Tiếng Anh', 'Tiếng Anh'],
            ].map(([v, l]) => (
              <label className="checkbox" key={v}>
                <input
                  type="radio"
                  name="language"
                  checked={language === v}
                  onChange={() => update('language', v)}
                />
                {l}
              </label>
            ))}
          </div>
          <div className="filter-group">
            <h4>Tình trạng sách</h4>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={available}
                onChange={() => update('available', available ? '' : '1')}
              />
              Chỉ hiện sách có sẵn
            </label>
          </div>
          <div className="filter-group">
            <h4>Nhà xuất bản</h4>
            <select
              value={params.get('publisher_id') || ''}
              onChange={(e) => update('publisher_id', e.target.value)}
            >
              <option value="">Tất cả nhà xuất bản</option>
              {publishers.data?.data.map((p: any) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="catalog-help">
            <BookOpen size={25} />
            <strong>Chưa biết đọc gì?</strong>
            <p>Thử một cuốn sách ngoài vùng quen thuộc của bạn.</p>
            <button
              onClick={() => {
                setParams({ featured: '1' })
                setSearch('')
              }}
            >
              Xem tủ sách tuyển chọn
              <ArrowRight size={14} />
            </button>
          </div>
        </aside>
        <div className="catalog-results">
          <div className="catalog-toolbar">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Tìm theo tên sách, tác giả, ISBN…"
            />
            <Button
              variant="outline"
              size="icon"
              className="filter-toggle"
              onClick={() => setFilters(!filters)}
              aria-label="Bộ lọc"
            >
              <SlidersHorizontal size={18} />
            </Button>
            <select
              aria-label="Sắp xếp sách"
              value={sort}
              onChange={(e) => update('sort', e.target.value)}
            >
              <option value="newest">Mới trên kệ sách</option>
              <option value="popular">Được mượn nhiều</option>
              <option value="title">Tên sách A → Z</option>
              <option value="year">Năm xuất bản</option>
              <option value="rating">Đánh giá cao</option>
            </select>
            <div className="view-toggle">
              <button
                className={view === 'grid' ? 'active' : ''}
                onClick={() => setView('grid')}
                aria-label="Dạng lưới"
              >
                <LayoutGrid size={17} />
              </button>
              <button
                className={view === 'list' ? 'active' : ''}
                onClick={() => setView('list')}
                aria-label="Dạng danh sách"
              >
                <List size={19} />
              </button>
            </div>
          </div>
          <div className="results-caption">
            <span>
              {query.isFetching ? (
                'Đang tìm sách…'
              ) : (
                <>
                  Tìm thấy <strong>{query.data?.meta?.total || 0}</strong> cuốn sách
                </>
              )}
            </span>
            {[
              category && cats.data?.data.find((c) => String(c.id) === category)?.name,
              language,
              available && 'Có sẵn',
              params.get('featured') && 'Tuyển chọn',
            ]
              .filter(Boolean)
              .map((s) => (
                <button
                  className="filter-chip"
                  key={String(s)}
                  onClick={() => {
                    setParams({})
                    setSearch('')
                  }}
                >
                  {s}
                  <X size={12} />
                </button>
              ))}
          </div>
          {query.isPending ? (
            <Skeleton cards />
          ) : query.isError ? (
            <ErrorState retry={() => query.refetch()} />
          ) : !query.data?.data.length ? (
            <Empty
              title={
                favorites
                  ? 'Tủ sách đang chờ những cuốn đầu tiên'
                  : 'Chưa tìm thấy cuốn sách phù hợp'
              }
              description="Thử đổi từ khóa hoặc khám phá một danh mục khác."
              action={
                <Button asChild variant="outline">
                  <Link to="/catalog">
                    Khám phá thư viện
                    <ArrowRight size={16} />
                  </Link>
                </Button>
              }
            />
          ) : view === 'grid' ? (
            <div className="book-grid catalog-book-grid">
              {query.data.data.map((b, i) => (
                <BookCard key={b.id} book={b} index={i} />
              ))}
            </div>
          ) : (
            <div className="book-list">
              {query.data.data.map((b) => (
                <Link className="book-list-row" to={'/books/' + b.id} key={b.id}>
                  <Cover book={b} />
                  <div>
                    <small className="purple">{b.categories[0]?.name}</small>
                    <h3>{b.title}</h3>
                    <p>{b.authors.map((a) => a.name).join(', ')}</p>
                    <span className="list-summary">{b.summary}</span>
                  </div>
                  <span className={'availability ' + (!b.available_count ? 'out' : '')}>
                    <i />
                    {b.available_count ? 'Có sẵn ' + b.available_count + ' bản' : 'Đang được mượn'}
                  </span>
                  <ArrowUpRight size={18} />
                </Link>
              ))}
            </div>
          )}
          {query.data && (
            <Pagination
              page={query.data.meta.current_page}
              last={query.data.meta.last_page}
              total={query.data.meta.total}
              onChange={(n) => update('page', String(n))}
            />
          )}
        </div>
      </div>
    </div>
  )
}
export function CategoriesPage() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['taxonomy', 'categories'],
    queryFn: () => get('/taxonomy/categories'),
  })
  return (
    <div className="container categories-page">
      <PageHeading
        eyebrow="TỪ TÒ MÒ ĐẾN THẤU HIỂU"
        title="Mỗi lĩnh vực, một chân trời."
        description="Đi theo sở thích. Hoặc thử một điều hoàn toàn mới."
      />
      {isPending ? (
        <Skeleton />
      ) : isError ? (
        <ErrorState retry={() => refetch()} />
      ) : (
        <div className="categories-grid">
          {data.data.map((c: any, i: number) => (
            <Link
              to={'/catalog?category=' + c.id}
              key={c.id}
              className="category-large"
              style={{ '--category-color': c.color } as React.CSSProperties}
            >
              <span className="category-index">{String(i + 1).padStart(2, '0')}</span>
              <BookOpen size={33} strokeWidth={1.2} />
              <h2>{c.name}</h2>
              <p>{c.description}</p>
              <span>
                {c.books_count} đầu sách
                <ArrowUpRight size={20} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
