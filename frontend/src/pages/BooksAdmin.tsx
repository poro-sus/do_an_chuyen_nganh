import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Plus,
  Download,
  Upload,
  LayoutGrid,
  List,
  Pencil,
  Trash2,
  Search,
  ImagePlus,
  Check,
  Layers,
  FileSpreadsheet,
} from 'lucide-react'
import { z } from 'zod'
import { toast } from 'sonner'
import { get, api, errorMessage, csrf } from '../lib/api'
import { useTask, useAuth } from '../app/auth'
import {
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
import { Modal } from '../components/ui/dialog'
import type { Book } from '../types'
import { EditorialEditor } from '../components/books/EditorialEditor'
const bookSchema = z.object({
  title: z.string().min(1, 'Nhập tên sách').max(255),
  language: z.string().min(1),
  author_ids: z.array(z.number()).min(1, 'Chọn ít nhất một tác giả'),
  category_ids: z.array(z.number()).min(1, 'Chọn ít nhất một danh mục'),
})
export default function BooksAdmin() {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search)
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [view, setView] = useState('table')
  const [editing, setEditing] = useState<Book | null | undefined>(undefined)
  const [copies, setCopies] = useState<Book | null>(null)
  const [deleting, setDeleting] = useState<Book | null>(null)
  const [importing, setImporting] = useState(false)
  const task = useTask()
  const { can } = useAuth()
  useEffect(() => {
    if (params.get('create')) {
      setEditing(null)
      setParams({}, { replace: true })
    }
  }, [params])
  const q = useQuery({
    queryKey: ['books', 'admin', debounced, category, page, sort],
    queryFn: () => get('/books', { search: debounced, category, page, sort, per_page: 12 }),
  })
  const cats = useQuery({
    queryKey: ['taxonomy', 'categories'],
    queryFn: () => get('/taxonomy/categories'),
  })
  return (
    <>
      <PageHeading
        eyebrow="BỘ SƯU TẬP CỦA THƯ VIỆN"
        title="Những thế giới trên kệ sách"
        description="Quản lý đầu sách, thông tin xuất bản và từng bản sao vật lý."
        actions={
          <>
            <Button variant="outline" onClick={() => setImporting(true)}>
              <Upload size={16} />
              Nhập dữ liệu
            </Button>
            <Button variant="outline" asChild>
              <a href="/api/reports/export?type=books&format=xlsx">
                <Download size={16} />
                Xuất Excel
              </a>
            </Button>
            <Button onClick={() => setEditing(null)}>
              <Plus size={17} />
              Thêm sách mới
            </Button>
          </>
        }
      />
      <section className="panel">
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v)
              setPage(1)
            }}
            placeholder="Tên sách, ISBN, tác giả…"
          />
          <div className="toolbar-right">
            <select
              aria-label="Danh mục"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Tất cả danh mục</option>
              {cats.data?.data.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Sắp xếp"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value)
                setPage(1)
              }}
            >
              <option value="newest">Mới nhất</option>
              <option value="title">Tên A → Z</option>
              <option value="popular">Lượt mượn</option>
              <option value="year">Năm xuất bản</option>
            </select>
            <div className="view-toggle">
              <button
                className={view === 'table' ? 'active' : ''}
                onClick={() => setView('table')}
                aria-label="Dạng bảng"
              >
                <List size={18} />
              </button>
              <button
                className={view === 'grid' ? 'active' : ''}
                onClick={() => setView('grid')}
                aria-label="Dạng lưới"
              >
                <LayoutGrid size={17} />
              </button>
            </div>
          </div>
        </div>
        {q.isPending ? (
          <Skeleton />
        ) : q.isError ? (
          <ErrorState retry={() => q.refetch()} />
        ) : !q.data?.data.length ? (
          <Empty
            title="Chưa tìm thấy đầu sách"
            description="Thử đổi bộ lọc hoặc thêm một cuốn sách mới."
            action={
              <Button onClick={() => setEditing(null)}>
                <Plus size={16} />
                Thêm đầu sách
              </Button>
            }
          />
        ) : (
          <>
            {view === 'table' ? (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Đầu sách</th>
                      <th>Danh mục</th>
                      <th>Bản sao</th>
                      <th>Lượt mượn</th>
                      <th>Hiển thị</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.data.map((b: Book) => (
                      <tr key={b.id}>
                        <td>
                          <div className="table-book">
                            <Cover book={b} />
                            <div>
                              <Link to={'/books/' + b.id}>{b.title}</Link>
                              <small>
                                {b.authors
                                  .map((a) => a.name)
                                  .slice(0, 2)
                                  .join(', ')}
                              </small>
                              <small className="isbn-text">{b.isbn || 'Chưa cập nhật ISBN'}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="category-tag">{b.categories[0]?.name || '—'}</span>
                          <small className="cell-sub">{b.language}</small>
                        </td>
                        <td>
                          <strong className="success-text">{b.available_count}</strong>
                          <span className="muted"> / {b.copies_count} khả dụng</span>
                          <small className="cell-sub">
                            <button className="inline-link" onClick={() => setCopies(b)}>
                              Quản lý bản sao
                            </button>
                          </small>
                        </td>
                        <td>{b.loans_count}</td>
                        <td>
                          <span className={'status-dot ' + (!b.visible ? 'muted' : 'success-text')}>
                            <i />
                            {b.visible ? 'Công khai' : 'Đã ẩn'}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Chỉnh sửa"
                              aria-label={'Sửa ' + b.title}
                              onClick={() => setEditing(b)}
                            >
                              <Pencil size={15} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Thêm bản sao"
                              aria-label={'Thêm bản sao ' + b.title}
                              onClick={() => setCopies(b)}
                            >
                              <Layers size={15} />
                            </Button>
                            {can('books.delete') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Lưu trữ"
                                aria-label={'Lưu trữ ' + b.title}
                                onClick={() => setDeleting(b)}
                              >
                                <Trash2 size={15} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-books-grid">
                {q.data.data.map((b: Book) => (
                  <div className="admin-book-card" key={b.id}>
                    <Link to={'/books/' + b.id}>
                      <Cover book={b} />
                    </Link>
                    <h3>{b.title}</h3>
                    <p>{b.authors[0]?.name}</p>
                    <span>
                      {b.available_count}/{b.copies_count} bản khả dụng
                    </span>
                    <div>
                      <Button size="sm" variant="outline" onClick={() => setEditing(b)}>
                        <Pencil size={13} />
                        Chỉnh sửa
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setCopies(b)}>
                        <Plus size={14} />
                        Bản sao
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? 'Chỉnh sửa đầu sách' : 'Thêm một thế giới mới'}
        description="Thông tin đầu sách độc lập với bản sao vật lý. Có thể thêm bản sao sau khi lưu."
        wide
      >
        {editing !== undefined && (
          <BookEditor book={editing} onDone={() => setEditing(undefined)} />
        )}
      </Modal>
      <Modal
        open={!!copies}
        onClose={() => setCopies(null)}
        title="Thêm bản sao vật lý"
        description={copies?.title}
      >
        {copies && <CopiesForm book={copies} onDone={() => setCopies(null)} />}
      </Modal>
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Lưu trữ đầu sách?"
        description="Sách sẽ được ẩn khỏi thư viện. Lịch sử mượn và tài chính được giữ lại."
      >
        <div className="info-box">
          {deleting?.title}
          <p>Không thể lưu trữ sách có phiếu mượn hoặc đặt trước đang hoạt động.</p>
        </div>
        <div className="modal-actions">
          <Button variant="outline" onClick={() => setDeleting(null)}>
            Quay lại
          </Button>
          <Button
            variant="destructive"
            disabled={task.isPending}
            onClick={() =>
              task.mutate(
                { url: '/books/' + deleting?.id, method: 'delete' },
                { onSuccess: () => setDeleting(null) },
              )
            }
          >
            Xác nhận lưu trữ
          </Button>
        </div>
      </Modal>
      <Modal
        open={importing}
        onClose={() => setImporting(false)}
        title="Nhập sách từ CSV / Excel"
        description="Kiểm tra toàn bộ tệp trước khi nhập. Nếu có dòng lỗi, chưa có dữ liệu nào được ghi."
      >
        <ImportForm onDone={() => setImporting(false)} />
      </Modal>
    </>
  )
}
function BookEditor({ book, onDone }: { book: Book | null; onDone: () => void }) {
  const task = useTask()
  const [data, setData] = useState<any>({
    title: book?.title || '',
    isbn: book?.isbn || '',
    author_ids: book?.authors.map((a) => a.id) || [],
    category_ids: book?.categories.map((c) => c.id) || [],
    publisher_id: book?.publisher?.id || '',
    year: book?.year || '',
    pages: book?.pages || '',
    language: book?.language || 'Tiếng Việt',
    summary: book?.summary || '',
    description: book?.description || '',
    editorial: book?.editorial || null,
    cover: book?.cover || '',
    price: book?.price || '',
    visible: book?.visible ?? true,
    featured: book?.featured || false,
  })
  const [errors, setErrors] = useState('')
  const [uploading, setUploading] = useState(false)
  const [metadata, setMetadata] = useState(false)
  const tax = useQuery({
    queryKey: ['book-editor-taxonomy'],
    queryFn: async () => {
      const [a, c, p] = await Promise.all([
        get('/taxonomy/authors'),
        get('/taxonomy/categories'),
        get('/taxonomy/publishers'),
      ])
      return { authors: a.data, categories: c.data, publishers: p.data }
    },
  })
  const set = (k: string, v: any) => setData((d: any) => ({ ...d, [k]: v }))
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = bookSchema.safeParse(data)
    if (!result.success) {
      setErrors(result.error.issues.map((i) => i.message).join('. '))
      return
    }
    setErrors('')
    const payload = {
      ...data,
      editorial: data.editorial
        ? {
            ...data.editorial,
            ...Object.fromEntries(
              ['introduction', 'takeaways', 'audience'].map((key) => [
                key,
                (data.editorial[key] || []).map((line: string) => line.trim()).filter(Boolean),
              ]),
            ),
          }
        : null,
      isbn: data.isbn || null,
      publisher_id: data.publisher_id ? Number(data.publisher_id) : null,
      year: data.year ? Number(data.year) : null,
      pages: data.pages ? Number(data.pages) : null,
      price: data.price ? Number(data.price) : null,
      cover: data.cover || null,
    }
    task.mutate(
      { url: '/books' + (book ? '/' + book.id : ''), method: book ? 'put' : 'post', data: payload },
      { onSuccess: onDone },
    )
  }
  const upload = async (file?: File) => {
    if (!file) return
    setUploading(true)
    try {
      await csrf()
      const f = new FormData()
      f.append('image', file)
      const r = await api.post('/api/uploads/cover', f)
      set('cover', r.data.data.url)
      toast.success('Đã tải ảnh bìa')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setUploading(false)
    }
  }
  const lookup = async () => {
    setMetadata(true)
    try {
      const r = await get('/metadata/isbn', { isbn: data.isbn })
      const b = r.data
      setData((d: any) => ({
        ...d,
        title: b.title || d.title,
        pages: b.number_of_pages || '',
        cover: b.cover?.large || b.cover?.medium || '',
      }))
      toast.success(
        'Đã lấy metadata. Hãy đối chiếu tên sách, tác giả và chọn danh mục trước khi lưu.',
      )
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setMetadata(false)
    }
  }
  return (
    <form onSubmit={submit} className="book-editor">
      <div className="book-editor-side">
        <Cover
          book={{
            id: book?.id || 0,
            title: data.title || 'Tên cuốn sách',
            authors: [],
            cover: data.cover,
          }}
        />
        <label className="upload-label">
          <ImagePlus size={16} />
          {uploading ? 'Đang tải…' : 'Tải ảnh bìa'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </label>
        <small>JPG, PNG, WebP · Tối đa 4MB</small>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={data.visible}
            onChange={(e) => set('visible', e.target.checked)}
          />
          Hiển thị công khai
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={data.featured}
            onChange={(e) => set('featured', e.target.checked)}
          />
          Sách tuyển chọn
        </label>
      </div>
      <div className="book-editor-fields">
        <div className="form-grid">
          <label className="form-label span-2">
            Tên sách *
            <input
              required
              maxLength={255}
              value={data.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Nhập tên đầu sách"
            />
          </label>
          <label className="form-label span-2">
            ISBN
            <div className="inline-input">
              <input
                value={data.isbn}
                onChange={(e) => set('isbn', e.target.value.replace(/[-\s]/g, ''))}
                placeholder="ISBN-10 hoặc ISBN-13"
              />
              <Button
                variant="outline"
                type="button"
                disabled={metadata || !data.isbn}
                onClick={lookup}
              >
                <Search size={15} />
                {metadata ? 'Đang tra…' : 'Tra ISBN'}
              </Button>
            </div>
          </label>
          <label className="form-label">
            Tác giả *
            <select
              multiple
              required
              value={data.author_ids.map(String)}
              onChange={(e) =>
                set(
                  'author_ids',
                  Array.from(e.target.selectedOptions, (o) => Number(o.value)),
                )
              }
            >
              {tax.data?.authors.map((a: any) => (
                <option value={a.id} key={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <small>Giữ Ctrl để chọn nhiều tác giả.</small>
          </label>
          <label className="form-label">
            Danh mục *
            <select
              multiple
              required
              value={data.category_ids.map(String)}
              onChange={(e) =>
                set(
                  'category_ids',
                  Array.from(e.target.selectedOptions, (o) => Number(o.value)),
                )
              }
            >
              {tax.data?.categories.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <small>Giữ Ctrl để chọn nhiều danh mục.</small>
          </label>
          <label className="form-label">
            Nhà xuất bản
            <select value={data.publisher_id} onChange={(e) => set('publisher_id', e.target.value)}>
              <option value="">Chưa cập nhật</option>
              {tax.data?.publishers.map((p: any) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-label">
            Ngôn ngữ
            <select value={data.language} onChange={(e) => set('language', e.target.value)}>
              <option>Tiếng Việt</option>
              <option>Tiếng Anh</option>
              <option>Tiếng Pháp</option>
              <option>Ngôn ngữ khác</option>
            </select>
          </label>
          <label className="form-label">
            Năm xuất bản
            <input
              type="number"
              min={1000}
              max={2100}
              value={data.year}
              onChange={(e) => set('year', e.target.value)}
            />
          </label>
          <label className="form-label">
            Số trang
            <input
              type="number"
              min={1}
              value={data.pages}
              onChange={(e) => set('pages', e.target.value)}
            />
          </label>
          <label className="form-label span-2">
            Giá tham khảo (VND)
            <input
              type="number"
              min={0}
              step={1000}
              value={data.price}
              onChange={(e) => set('price', e.target.value)}
              placeholder="Để trống nếu chưa xác minh"
            />
          </label>
          <label className="form-label span-2">
            Giới thiệu ngắn
            <textarea
              maxLength={2000}
              value={data.summary}
              onChange={(e) => set('summary', e.target.value)}
            />
          </label>
          <label className="form-label span-2">
            Mô tả chi tiết
            <textarea
              maxLength={20000}
              value={data.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </label>
        </div>
        <EditorialEditor value={data.editorial} onChange={(v) => set('editorial', v)} />
        {errors && (
          <div className="form-error" role="alert">
            {errors}
          </div>
        )}
        <div className="modal-actions">
          <Button variant="outline" type="button" onClick={onDone}>
            Quay lại
          </Button>
          <Button disabled={task.isPending || uploading}>
            {task.isPending ? 'Đang lưu…' : book ? 'Lưu thay đổi' : 'Tạo đầu sách'}
            <Check size={16} />
          </Button>
        </div>
      </div>
    </form>
  )
}
export function CopiesForm({ book, onDone }: { book: Book; onDone: () => void }) {
  const task = useTask()
  const [count, setCount] = useState(1)
  const [shelf, setShelf] = useState('')
  const { data } = useQuery({
    queryKey: ['taxonomy', 'shelves'],
    queryFn: () => get('/taxonomy/shelves'),
  })
  return (
    <form
      className="stack-form"
      onSubmit={(e) => {
        e.preventDefault()
        task.mutate(
          {
            url: '/books/' + book.id + '/copies',
            data: { count, shelf_id: shelf ? Number(shelf) : null },
          },
          { onSuccess: onDone },
        )
      }}
    >
      <label className="form-label">
        Số bản sao cần nhập
        <input
          required
          type="number"
          min={1}
          max={50}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
        />
      </label>
      <label className="form-label">
        Vị trí kệ
        <select value={shelf} onChange={(e) => setShelf(e.target.value)}>
          <option value="">Chưa xếp kệ</option>
          {data?.data.map((s: any) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <p className="info-box">
        Mỗi bản sao được cấp barcode duy nhất. Nếu có hàng chờ, hệ thống tự giữ sách cho người đủ
        điều kiện đầu tiên.
      </p>
      <div className="modal-actions">
        <Button variant="outline" type="button" onClick={onDone}>
          Quay lại
        </Button>
        <Button disabled={task.isPending}>
          <Plus size={15} />
          Nhập bản sao
        </Button>
      </div>
    </form>
  )
}
function ImportForm({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<File>()
  const [errors, setErrors] = useState('')
  const task = useTask()
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    const f = new FormData()
    f.append('file', file)
    task.mutate(
      { url: '/books/import', data: f },
      { onSuccess: onDone, onError: (e) => setErrors(errorMessage(e)) },
    )
  }
  return (
    <form className="stack-form" onSubmit={submit}>
      <div className="import-guide">
        <FileSpreadsheet size={34} />
        <h3>Chuẩn bị tệp nhập sách</h3>
        <p>
          Cột bắt buộc: <code>title, author, category, language</code>
          <br />
          Tùy chọn: <code>isbn, copies</code>
        </p>
        <a href="/import-template.csv" download className="text-link">
          <Download size={15} />
          Tải CSV mẫu
        </a>
      </div>
      <label className="upload-drop">
        <Upload size={26} />
        <strong>{file?.name || 'Chọn tệp CSV hoặc XLSX'}</strong>
        <span>Tối đa 4MB và 500 dòng</span>
        <input
          required
          type="file"
          accept=".csv,.xlsx"
          onChange={(e) => {
            setFile(e.target.files?.[0])
            setErrors('')
          }}
        />
      </label>
      {errors && (
        <div role="alert" className="form-error">
          {errors}
        </div>
      )}
      <div className="modal-actions">
        <Button variant="outline" type="button" onClick={onDone}>
          Quay lại
        </Button>
        <Button disabled={!file || task.isPending}>
          {task.isPending ? 'Đang kiểm tra…' : 'Kiểm tra & nhập sách'}
        </Button>
      </div>
    </form>
  )
}
