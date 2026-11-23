import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import JsBarcode from 'jsbarcode'
import { Pencil, History, Printer, Download, Plus } from 'lucide-react'
import { get } from '../lib/api'
import { useTask } from '../app/auth'
import {
  PageHeading,
  SearchInput,
  useDebounce,
  Skeleton,
  ErrorState,
  Empty,
  Pagination,
  Badge,
} from '../components/common'
import { Button } from '../components/ui/button'
import { Modal } from '../components/ui/dialog'
import { date } from '../lib/utils'
import { CopiesForm } from './BooksAdmin'
export default function Copies() {
  const [search, setSearch] = useState('')
  const term = useDebounce(search)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<any>(null)
  const [history, setHistory] = useState<any>(null)
  const [printing, setPrinting] = useState(false)
  const [adding, setAdding] = useState(false)
  const [bookId, setBookId] = useState('')
  const q = useQuery({
    queryKey: ['copies', term, status, page],
    queryFn: () => get('/book-copies', { search: term, status, page }),
  })
  const h = useQuery({
    queryKey: ['copy-history', history?.id],
    queryFn: () => get('/book-copies/' + history.id),
    enabled: !!history,
  })
  const books = useQuery({
    queryKey: ['books', 'copy-select'],
    queryFn: () => get('/books', { per_page: 100 }),
    enabled: adding,
  })
  const selectedBook = books.data?.data.find((b: any) => String(b.id) === bookId)
  return (
    <>
      <PageHeading
        eyebrow="TỪNG CUỐN SÁCH ĐỀU CÓ MỘT CÂU CHUYỆN"
        title="Bản sao & kho sách"
        description="Quản lý barcode, vị trí, tình trạng và hành trình của từng hiện vật."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setPrinting(true)}
              disabled={!q.data?.data.length}
            >
              <Printer size={16} />
              In nhãn barcode
            </Button>
            <Button variant="outline" asChild>
              <a href="/api/reports/export?type=inventory&format=xlsx">
                <Download size={16} />
                Xuất kho
              </a>
            </Button>
            <Button onClick={() => setAdding(true)}>
              <Plus size={16} />
              Nhập bản sao
            </Button>
          </>
        }
      />
      <section className="panel">
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={(s) => {
              setSearch(s)
              setPage(1)
            }}
            placeholder="Quét barcode hoặc tìm tên sách…"
          />
          <select
            aria-label="Trạng thái bản sao"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Tất cả trạng thái</option>
            {[
              ['available', 'Khả dụng'],
              ['borrowed', 'Đang mượn'],
              ['held', 'Đang giữ chỗ'],
              ['maintenance', 'Bảo trì'],
              ['lost', 'Đã mất'],
            ].map(([s, l]) => (
              <option key={s} value={s}>
                {l}
              </option>
            ))}
          </select>
        </div>
        {q.isPending ? (
          <Skeleton />
        ) : q.isError ? (
          <ErrorState retry={() => q.refetch()} />
        ) : !q.data.data.length ? (
          <Empty title="Chưa tìm thấy bản sao" />
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Đầu sách</th>
                    <th>Barcode</th>
                    <th>Vị trí kệ</th>
                    <th>Tình trạng</th>
                    <th>Khả dụng</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.data.map((c: any) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.book?.title || 'Đầu sách đã lưu trữ'}</strong>
                        <small className="cell-sub">Nhập ngày {date(c.acquired_at)}</small>
                      </td>
                      <td>
                        <code className="barcode-code">{c.barcode}</code>
                      </td>
                      <td>{c.shelf?.name || 'Chưa xếp kệ'}</td>
                      <td>
                        <Badge status={c.condition} />
                      </td>
                      <td>
                        <Badge status={c.status} />
                      </td>
                      <td>
                        <div className="row-actions">
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Lịch sử"
                            aria-label={'Lịch sử ' + c.barcode}
                            onClick={() => setHistory(c)}
                          >
                            <History size={16} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Chỉnh sửa"
                            aria-label={'Sửa ' + c.barcode}
                            disabled={['borrowed', 'held'].includes(c.status)}
                            onClick={() => setEditing(c)}
                          >
                            <Pencil size={15} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Cập nhật bản sao"
        description={editing?.barcode}
      >
        {editing && <CopyForm item={editing} onDone={() => setEditing(null)} />}
      </Modal>
      <Modal
        open={!!history}
        onClose={() => setHistory(null)}
        title="Hành trình của bản sao"
        description={history?.barcode}
        wide
      >
        {h.isPending ? (
          <Skeleton />
        ) : h.isError ? (
          <ErrorState retry={() => h.refetch()} />
        ) : (
          <>
            <div className="info-box">
              <strong>{h.data?.data.book?.title}</strong>
              <p>{h.data?.data.shelf?.name || 'Chưa xếp kệ'}</p>
            </div>
            {h.data?.data.loans.length ? (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Độc giả</th>
                      <th>Ngày nhận</th>
                      <th>Ngày trả</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {h.data.data.loans.map((l: any) => (
                      <tr key={l.id}>
                        <td>{l.user?.name}</td>
                        <td>{date(l.borrowed_at)}</td>
                        <td>{date(l.returned_at)}</td>
                        <td>
                          <Badge status={l.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="Bản sao chưa được mượn" />
            )}
          </>
        )}
      </Modal>
      <Modal
        open={printing}
        onClose={() => setPrinting(false)}
        title="In nhãn bản sao"
        description="In barcode Code 128 cho các bản sao đang hiển thị trên trang."
        wide
      >
        <div className="barcode-labels">
          {q.data?.data.map((c: any) => (
            <BarcodeLabel item={c} key={c.id} />
          ))}
        </div>
        <div className="modal-actions">
          <Button variant="outline" onClick={() => setPrinting(false)}>
            Đóng
          </Button>
          <Button onClick={() => window.print()}>
            <Printer size={16} />
            In nhãn
          </Button>
        </div>
      </Modal>
      <Modal open={adding} onClose={() => setAdding(false)} title="Nhập thêm bản sao">
        <label className="form-label">
          Đầu sách
          <select value={bookId} onChange={(e) => setBookId(e.target.value)}>
            <option value="">Chọn đầu sách</option>
            {books.data?.data.map((b: any) => (
              <option value={b.id} key={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </label>
        {selectedBook && <CopiesForm book={selectedBook} onDone={() => setAdding(false)} />}
      </Modal>
      {printing && (
        <div className="print-sheet">
          {q.data?.data.map((c: any) => (
            <BarcodeLabel key={c.id} item={c} />
          ))}
        </div>
      )}
    </>
  )
}
function CopyForm({ item, onDone }: { item: any; onDone: () => void }) {
  const task = useTask()
  const [d, setD] = useState({
    status: item.status,
    condition: item.condition,
    shelf_id: item.shelf_id || '',
    notes: item.notes || '',
  })
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
            url: '/book-copies/' + item.id,
            method: 'put',
            data: { ...d, shelf_id: d.shelf_id ? Number(d.shelf_id) : null },
          },
          { onSuccess: onDone },
        )
      }}
    >
      <label className="form-label">
        Trạng thái
        <select
          value={d.status}
          onChange={(e) => {
            const status = e.target.value
            setD((p) => ({
              ...p,
              status,
              condition: status === 'lost' ? 'lost' : status === 'maintenance' ? 'damaged' : 'good',
            }))
          }}
        >
          <option value="available">Khả dụng</option>
          <option value="maintenance">Bảo trì</option>
          <option value="lost">Đã mất</option>
        </select>
      </label>
      <label className="form-label">
        Tình trạng
        <select
          value={d.condition}
          onChange={(e) => setD((p) => ({ ...p, condition: e.target.value }))}
        >
          <option value="good">Tốt</option>
          <option value="worn">Đã sử dụng</option>
          <option value="damaged">Hư hỏng</option>
          <option value="lost">Mất sách</option>
        </select>
      </label>
      <label className="form-label">
        Vị trí
        <select
          value={d.shelf_id}
          onChange={(e) => setD((p) => ({ ...p, shelf_id: e.target.value }))}
        >
          <option value="">Chưa xếp kệ</option>
          {data?.data.map((s: any) => (
            <option value={s.id} key={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="form-label">
        Ghi chú
        <textarea
          value={d.notes}
          onChange={(e) => setD((p) => ({ ...p, notes: e.target.value }))}
          maxLength={2000}
        />
      </label>
      <div className="modal-actions">
        <Button type="button" variant="outline" onClick={onDone}>
          Quay lại
        </Button>
        <Button disabled={task.isPending}>Lưu bản sao</Button>
      </div>
    </form>
  )
}
function BarcodeLabel({ item }: { item: any }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (ref.current)
      JsBarcode(ref.current, item.barcode, {
        format: 'CODE128',
        height: 40,
        width: 1.4,
        fontSize: 12,
        margin: 6,
        background: '#ffffff',
        lineColor: '#171B2E',
      })
  }, [item.barcode])
  return (
    <div className="barcode-label">
      <strong>LIBRIVO · {item.book?.title}</strong>
      <svg ref={ref} />
      <small>{item.shelf?.name || 'Thư viện LIBRIVO'}</small>
    </div>
  )
}
