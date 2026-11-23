import { Plus, Trash2 } from 'lucide-react'
import type { BookEditorial } from '../../types'
import { Button } from '../ui/button'
export function EditorialEditor({
  value,
  onChange,
}: {
  value?: BookEditorial | null
  onChange: (v: BookEditorial) => void
}) {
  const d = value || {}
  const set = (key: keyof BookEditorial, v: unknown) => onChange({ ...d, [key]: v })
  const textList = (key: 'takeaways' | 'audience', label: string) => (
    <label className="form-label" key={key}>
      {label}
      <textarea
        value={d[key]?.join('\n') || ''}
        onChange={(e) => set(key, e.target.value.split('\n'))}
        placeholder="Mỗi ý trên một dòng"
      />
    </label>
  )
  return (
    <details className="editorial-editor">
      <summary>
        Nội dung giới thiệu chuyên sâu <span>Giới thiệu · chủ đề · gợi ý đọc</span>
      </summary>
      <div className="stack-form">
        <label className="form-label">
          Thông điệp của cuốn sách
          <input
            value={d.headline || ''}
            maxLength={300}
            onChange={(e) => set('headline', e.target.value)}
          />
        </label>
        <label className="form-label">
          Giới thiệu chi tiết
          <textarea
            rows={7}
            value={d.introduction?.join('\n\n') || ''}
            onChange={(e) => set('introduction', e.target.value.split(/\n\s*\n/))}
          />
          <small>Ngăn cách các đoạn bằng một dòng trống.</small>
        </label>
        {textList('takeaways', 'Điều người đọc có thể rút ra')}
        {textList('audience', 'Đối tượng đọc phù hợp')}
        {(['topics', 'reading_guide'] as const).map((key) => (
          <div className="editorial-editor-list" key={key}>
            <h4>{key === 'topics' ? 'Chủ đề nổi bật' : 'Gợi ý đọc'}</h4>
            {d[key]?.map((t, i) => (
              <div className="editorial-editor-item" key={i}>
                <input
                  aria-label={(key === 'topics' ? 'Tên chủ đề ' : 'Tên bước đọc ') + (i + 1)}
                  value={t.title}
                  onChange={(e) =>
                    set(
                      key,
                      d[key]?.map((v, j) => (j === i ? { ...v, title: e.target.value } : v)),
                    )
                  }
                  placeholder="Tiêu đề"
                  required
                />
                <textarea
                  aria-label={'Mô tả ' + (i + 1)}
                  value={t.description}
                  onChange={(e) =>
                    set(
                      key,
                      d[key]?.map((v, j) => (j === i ? { ...v, description: e.target.value } : v)),
                    )
                  }
                  placeholder="Mô tả"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    set(
                      key,
                      d[key]?.filter((_, j) => j !== i),
                    )
                  }
                >
                  <Trash2 size={13} />
                  Bỏ mục
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => set(key, [...(d[key] || []), { title: '', description: '' }])}
              disabled={(d[key]?.length || 0) >= (key === 'topics' ? 12 : 8)}
            >
              <Plus size={13} />
              Thêm {key === 'topics' ? 'chủ đề' : 'bước đọc'}
            </Button>
          </div>
        ))}
        <label className="form-label">
          Ghi chú về ấn bản
          <textarea
            value={d.edition_note || ''}
            maxLength={2000}
            onChange={(e) => set('edition_note', e.target.value)}
          />
        </label>
      </div>
    </details>
  )
}
