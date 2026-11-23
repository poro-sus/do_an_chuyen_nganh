import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, FolderOpen, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { get } from '../lib/api'
import { useTask } from '../app/auth'
import {
  PageHeading,
  SearchInput,
  useDebounce,
  Skeleton,
  ErrorState,
  Empty,
} from '../components/common'
import { Button } from '../components/ui/button'
import { Modal } from '../components/ui/dialog'
const labels: Record<string, string> = {
  categories: 'Danh mục',
  authors: 'Tác giả',
  publishers: 'Nhà xuất bản',
  shelves: 'Kệ sách',
}
export default function Taxonomy({ type }: { type: string }) {
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search)
  const [selected, setSelected] = useState<any>(undefined)
  const [deleting, setDeleting] = useState<any>(null)
  const task = useTask()
  const q = useQuery({
    queryKey: ['taxonomy', type, debounced],
    queryFn: () => get('/taxonomy/' + type, { search: debounced }),
  })
  return (
    <>
      <PageHeading
        eyebrow="SẮP XẾP THẾ GIỚI TRI THỨC"
        title={labels[type]}
        description={
          {
            categories: 'Tổ chức sách theo lĩnh vực và danh mục cha/con.',
            authors: 'Những người đứng sau câu chuyện và ý tưởng trong thư viện.',
            publishers: 'Quản lý đơn vị xuất bản và thông tin liên hệ.',
            shelves: 'Mỗi cuốn sách đều có một chỗ để trở về.',
          }[type]
        }
        actions={
          <Button onClick={() => setSelected(null)}>
            <Plus size={17} />
            Thêm {labels[type].toLowerCase()}
          </Button>
        }
      />
      <section className="panel">
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={'Tìm ' + labels[type].toLowerCase() + '…'}
          />
          <span className="muted">{q.data?.data.length || 0} mục</span>
        </div>
        {q.isPending ? (
          <Skeleton />
        ) : q.isError ? (
          <ErrorState retry={() => q.refetch()} />
        ) : !q.data?.data.length ? (
          <Empty title="Chưa có dữ liệu phù hợp" />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{labels[type]}</th>
                  <th>
                    {type === 'publishers'
                      ? 'Liên hệ'
                      : type === 'shelves'
                        ? 'Vị trí'
                        : 'Thông tin'}
                  </th>
                  <th>{type === 'shelves' ? 'Bản sao' : 'Đầu sách'}</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {q.data.data.map((r: any) => (
                  <tr key={r.id}>
                    <td>
                      <div className="taxonomy-name">
                        <span
                          style={{
                            background: (r.color || '#7567E8') + '16',
                            color: r.color || '#7567E8',
                          }}
                        >
                          <FolderOpen size={19} />
                        </span>
                        <strong>{r.name}</strong>
                      </div>
                    </td>
                    <td className="taxonomy-description">
                      {type === 'publishers' ? (
                        <>
                          {r.email || 'Chưa có email'}
                          <small className="cell-sub">{r.phone || ''}</small>
                        </>
                      ) : type === 'shelves' ? (
                        r.location || 'Chưa cập nhật'
                      ) : type === 'authors' ? (
                        r.bio || 'Chưa cập nhật tiểu sử'
                      ) : r.parent_id ? (
                        'Danh mục con · #' + r.parent_id
                      ) : (
                        r.description || 'Danh mục chính'
                      )}
                    </td>
                    <td>
                      <span className="count-pill">{r.books_count ?? r.copies_count ?? 0}</span>
                    </td>
                    <td>
                      <div className="row-actions">
                        {type !== 'shelves' && (
                          <Button variant="ghost" size="icon" asChild>
                            <Link
                              to={
                                type === 'categories'
                                  ? '/catalog?category=' + r.id
                                  : '/catalog?search=' + encodeURIComponent(r.name)
                              }
                              aria-label="Khám phá sách"
                            >
                              <ArrowUpRight size={16} />
                            </Link>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={'Sửa ' + r.name}
                          onClick={() => setSelected(r)}
                        >
                          <Pencil size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={'Xóa ' + r.name}
                          onClick={() => setDeleting(r)}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Modal
        open={selected !== undefined}
        onClose={() => setSelected(undefined)}
        title={(selected ? 'Chỉnh sửa ' : 'Thêm ') + labels[type].toLowerCase()}
      >
        {selected !== undefined && (
          <TaxonomyForm type={type} item={selected} onDone={() => setSelected(undefined)} />
        )}
      </Modal>
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Xóa mục này?"
        description="Chỉ có thể xóa dữ liệu chưa được sách, bản sao hoặc danh mục con sử dụng."
      >
        <p className="info-box">{deleting?.name}</p>
        <div className="modal-actions">
          <Button variant="outline" onClick={() => setDeleting(null)}>
            Quay lại
          </Button>
          <Button
            variant="destructive"
            disabled={task.isPending}
            onClick={() =>
              task.mutate(
                { url: '/taxonomy/' + type + '/' + deleting.id, method: 'delete' },
                { onSuccess: () => setDeleting(null) },
              )
            }
          >
            Xác nhận xóa
          </Button>
        </div>
      </Modal>
    </>
  )
}
function TaxonomyForm({ type, item, onDone }: { type: string; item: any; onDone: () => void }) {
  const task = useTask()
  const [d, setD] = useState<any>({
    name: item?.name || '',
    description: item?.description || '',
    bio: item?.bio || '',
    parent_id: item?.parent_id || '',
    color: item?.color || '#7567E8',
    email: item?.email || '',
    phone: item?.phone || '',
    address: item?.address || '',
    location: item?.location || '',
  })
  const { data } = useQuery({
    queryKey: ['taxonomy', 'categories'],
    queryFn: () => get('/taxonomy/categories'),
    enabled: type === 'categories',
  })
  const field = (k: string, v: string) => setD((p: any) => ({ ...p, [k]: v }))
  return (
    <form
      className="stack-form"
      onSubmit={(e) => {
        e.preventDefault()
        task.mutate(
          {
            url: '/taxonomy/' + type + (item ? '/' + item.id : ''),
            method: item ? 'put' : 'post',
            data: { ...d, parent_id: d.parent_id ? Number(d.parent_id) : null },
          },
          { onSuccess: onDone },
        )
      }}
    >
      <label className="form-label">
        Tên {labels[type].toLowerCase()} *
        <input
          required
          maxLength={200}
          value={d.name}
          onChange={(e) => field('name', e.target.value)}
        />
      </label>
      {type === 'categories' && (
        <>
          <label className="form-label">
            Danh mục cha
            <select value={d.parent_id} onChange={(e) => field('parent_id', e.target.value)}>
              <option value="">Không có — danh mục chính</option>
              {data?.data
                .filter((c: any) => c.id !== item?.id)
                .map((c: any) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="form-label">
            Màu danh mục
            <input type="color" value={d.color} onChange={(e) => field('color', e.target.value)} />
          </label>
          <label className="form-label">
            Mô tả
            <textarea
              value={d.description}
              onChange={(e) => field('description', e.target.value)}
              maxLength={2000}
            />
          </label>
        </>
      )}
      {type === 'authors' && (
        <label className="form-label">
          Tiểu sử
          <textarea value={d.bio} onChange={(e) => field('bio', e.target.value)} maxLength={5000} />
        </label>
      )}
      {type === 'publishers' && (
        <>
          <label className="form-label">
            Email
            <input type="email" value={d.email} onChange={(e) => field('email', e.target.value)} />
          </label>
          <label className="form-label">
            Điện thoại
            <input
              value={d.phone}
              onChange={(e) => field('phone', e.target.value)}
              maxLength={30}
            />
          </label>
          <label className="form-label">
            Địa chỉ
            <textarea value={d.address} onChange={(e) => field('address', e.target.value)} />
          </label>
        </>
      )}
      {type === 'shelves' && (
        <label className="form-label">
          Vị trí
          <input
            value={d.location}
            onChange={(e) => field('location', e.target.value)}
            maxLength={255}
          />
        </label>
      )}
      <div className="modal-actions">
        <Button variant="outline" type="button" onClick={onDone}>
          Quay lại
        </Button>
        <Button disabled={task.isPending}>Lưu thông tin</Button>
      </div>
    </form>
  )
}
