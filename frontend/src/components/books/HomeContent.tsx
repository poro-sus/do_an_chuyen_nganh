import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bookmark,
  CalendarClock,
  Check,
  ChevronDown,
  Heart,
  Mail,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react'
import { get } from '../../lib/api'
import { money } from '../../lib/utils'
import type { Book, Page, Taxon } from '../../types'
import { Cover, Reveal } from '../common'
import { Button } from '../ui/button'

const collections = [
  {
    category: 'Phát triển bản thân',
    title: 'Thêm một chút tốt hơn, mỗi ngày.',
    description:
      'Khám phá những góc nhìn về thói quen, sự tập trung và hành trình hiểu chính mình.',
    label: 'CHO SỰ PHÁT TRIỂN CỦA BẠN',
    color: 'sage',
  },
  {
    category: 'Lập trình',
    title: 'Ý tưởng hay. Những dòng mã tốt.',
    description: 'Từ tư duy giải quyết vấn đề đến kỹ năng xây dựng phần mềm, bắt đầu với sự tò mò.',
    label: 'CHO NHỮNG NGƯỜI THÍCH XÂY DỰNG',
    color: 'lilac',
  },
  {
    category: 'Văn học',
    title: 'Đi thật xa, qua từng trang sách.',
    description:
      'Dành một khoảng lặng cho những câu chuyện, nhân vật và trải nghiệm ngoài thế giới quen thuộc.',
    label: 'CHO MỘT TÂM HỒN RỘNG MỞ',
    color: 'sand',
  },
]
export function HomeCollections({
  categories,
  spotlight,
}: {
  categories: Taxon[]
  spotlight?: Book
}) {
  return (
    <section className="container home-collections-section">
      <Reveal className="section-heading">
        <div>
          <span className="eyebrow">CHỌN MỘT HƯỚNG ĐI CHO SỰ TÒ MÒ</span>
          <h2>
            Một tâm trạng. <em>Một tủ sách.</em>
          </h2>
          <p className="section-description">
            Đôi khi bạn không cần một tựa sách cụ thể, chỉ cần một nơi để bắt đầu.
          </p>
        </div>
        <Link className="text-link" to="/categories">
          Khám phá theo lĩnh vực
          <ArrowUpRight size={16} />
        </Link>
      </Reveal>
      <div className="themed-collections">
        {collections.map((c) => (
          <CollectionCard
            key={c.category}
            content={c}
            category={categories.find((t) => t.name === c.category)}
          />
        ))}
      </div>
      {spotlight && (
        <Reveal className="home-book-spotlight">
          <div className="spotlight-cover">
            <span>THE READING ROOM</span>
            <Cover book={spotlight} />
            <i>✧</i>
          </div>
          <div className="spotlight-copy">
            <span className="eyebrow">
              <Sparkles size={14} /> MỘT CUỐN SÁCH, MỘT GÓC NHÌN MỚI
            </span>
            <h2>{spotlight.title}</h2>
            <p className="spotlight-author">{spotlight.authors.map((a) => a.name).join(' · ')}</p>
            <h3>
              {spotlight.editorial?.headline || 'Một lựa chọn để tiếp nối hành trình khám phá.'}
            </h3>
            <p>{spotlight.summary}</p>
            <div className="spotlight-topics">
              {spotlight.editorial?.topics?.slice(0, 3).map((t) => (
                <span key={t.title}>
                  <Check size={12} />
                  {t.title}
                </span>
              ))}
            </div>
            <div className="spotlight-actions">
              <Button asChild>
                <Link to={'/books/' + spotlight.id}>
                  Tìm hiểu cuốn sách
                  <ArrowRight size={16} />
                </Link>
              </Button>
              <span>
                <i />
                {spotlight.available_count
                  ? `${spotlight.available_count} bản sẵn sàng cho bạn`
                  : 'Có thể tham gia hàng chờ đặt trước'}
              </span>
            </div>
          </div>
        </Reveal>
      )}
    </section>
  )
}
function CollectionCard({
  content: c,
  category,
}: {
  content: (typeof collections)[number]
  category?: Taxon
}) {
  const { data } = useQuery({
    queryKey: ['home-collection', category?.id],
    queryFn: () =>
      get<Page<Book>>('/books', { category: category?.id, per_page: 2, sort: 'popular' }),
    enabled: !!category,
  })
  return (
    <Reveal className={'themed-collection ' + c.color}>
      <div className="collection-cover-stage">
        {data?.data.map((b, i) => (
          <div key={b.id} className={'collection-cover collection-cover-' + i}>
            <Cover book={b} />
          </div>
        ))}
        <span className="collection-symbol">✧</span>
      </div>
      <div className="collection-copy">
        <span className="eyebrow">{c.label}</span>
        <h3>{c.title}</h3>
        <p>{c.description}</p>
        <Link to={category ? '/catalog?category=' + category.id : '/catalog'}>
          <span>
            {category
              ? `${category.books_count || 0} đầu sách trong bộ sưu tập`
              : 'Khám phá bộ sưu tập'}
          </span>
          <ArrowUpRight size={18} />
        </Link>
      </div>
    </Reveal>
  )
}

export function HomeReadingJourney({
  settings,
  user,
}: {
  settings?: Record<string, string>
  user: boolean
}) {
  return (
    <>
      <section className="container reading-journey-section">
        <Reveal className="section-heading">
          <div>
            <span className="eyebrow">TỪ KHÁM PHÁ ĐẾN CUỘC HẸN VỚI SÁCH</span>
            <h2>
              Cuốn sách hay, <em>gần bạn hơn.</em>
            </h2>
            <p className="section-description">
              Một hành trình rõ ràng để bạn dành nhiều thời gian hơn cho việc đọc.
            </p>
          </div>
          <Link className="text-link" to="/policy">
            Tìm hiểu chính sách
            <ArrowUpRight size={16} />
          </Link>
        </Reveal>
        <div className="borrowing-steps">
          {[
            {
              icon: UserRound,
              title: 'Tạo không gian của bạn',
              text: 'Đăng ký tài khoản để lưu sách yêu thích, gửi yêu cầu và theo dõi hoạt động của mình.',
            },
            {
              icon: Search,
              title: 'Tìm một cuốn sách',
              text: 'Tìm theo tên, tác giả hoặc chủ đề. Xem nội dung giới thiệu và tình trạng bản sao trước khi chọn.',
            },
            {
              icon: BookOpen,
              title: 'Gửi yêu cầu & nhận sách',
              text: 'Nhân viên kiểm tra, phê duyệt và thông báo khi sách sẵn sàng. Đến quầy để nhận sách và bắt đầu lượt mượn.',
            },
            {
              icon: CalendarClock,
              title: 'Đọc, rồi hẹn gặp lại',
              text: 'Theo dõi hạn trả trên tài khoản. Trả sách tại quầy hoặc gửi yêu cầu gia hạn để thư viện xem xét.',
            },
          ].map((s, i) => (
            <Reveal key={s.title} delay={i * 0.04} className="borrowing-step">
              <div className="borrowing-step-top">
                <span>
                  <s.icon size={24} strokeWidth={1.5} />
                </span>
                <b>0{i + 1}</b>
              </div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </Reveal>
          ))}
        </div>
        <div className="journey-bottom">
          <div>
            {settings ? (
              <>
                <span>
                  <BookOpen size={16} />
                  <strong>{settings.max_books} cuốn</strong> trong mỗi hành trình
                </span>
                <span>
                  <CalendarClock size={16} />
                  <strong>{settings.loan_days} ngày</strong> cho mỗi lượt mượn
                </span>
                <span>
                  <ShieldCheck size={16} />
                  Lịch sử và hạn trả luôn trong tầm tay
                </span>
              </>
            ) : (
              <span className="muted">
                Theo dõi yêu cầu, hạn trả và lịch sử ngay trên tài khoản.
              </span>
            )}
          </div>
          <Button asChild variant="outline">
            <Link to={user ? '/catalog' : '/register'}>
              {user ? 'Chọn cuốn sách đầu tiên' : 'Bắt đầu hành trình'}
              <ArrowRight size={15} />
            </Link>
          </Button>
        </div>
      </section>
      <section className="member-benefits-section">
        <div className="container member-benefits-inner">
          <Reveal className="member-benefits-copy">
            <span className="eyebrow">MỘT THƯ VIỆN BIẾT ĐỒNG HÀNH</span>
            <h2>
              Ít bận tâm hơn.
              <br />
              Nhiều trang sách hơn.
            </h2>
            <p>
              Không chỉ là tìm một cuốn sách. LIBRIVO giúp bạn giữ lại những điều muốn đọc và theo
              dõi từng cuộc hẹn với thư viện.
            </p>
            <Button asChild>
              <Link to={user ? '/reader' : '/register'}>
                {user ? 'Ghé không gian của bạn' : 'Tạo tài khoản thành viên'}
                <ArrowUpRight size={16} />
              </Link>
            </Button>
          </Reveal>
          <div className="member-benefits-grid">
            {[
              {
                icon: Heart,
                title: 'Một tủ sách mang tên bạn',
                text: 'Lưu những cuốn sách khiến bạn tò mò, để lần ghé thư viện tiếp theo đã có một nơi để bắt đầu.',
              },
              {
                icon: CalendarClock,
                title: 'Mỗi ngày hẹn đều rõ ràng',
                text: 'Xem sách đang mượn, hạn trả và lịch sử giao dịch trong không gian cá nhân.',
              },
              {
                icon: Bookmark,
                title: 'Không bỏ lỡ cuốn sách hay',
                text: 'Đặt trước khi sách hết bản khả dụng. Theo dõi hàng chờ và nhận thông báo trong tài khoản.',
              },
              {
                icon: Users,
                title: 'Góc nhìn từ người đã đọc',
                text: 'Tham khảo đánh giá của thành viên đã mượn và trả sách; chia sẻ cảm nhận sau hành trình của bạn.',
              },
            ].map((b) => (
              <Reveal className="member-benefit" key={b.title}>
                <span>
                  <b.icon size={22} strokeWidth={1.5} />
                </span>
                <h3>{b.title}</h3>
                <p>{b.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export function HomeQuestions({ settings }: { settings?: Record<string, string> }) {
  const questions = [
    [
      'Tôi cần làm gì để bắt đầu mượn sách?',
      'Tạo tài khoản hoặc đăng nhập, chọn sách có bản khả dụng và gửi yêu cầu mượn. Thư viện sẽ kiểm tra điều kiện, duyệt yêu cầu và thông báo để bạn đến nhận sách. Lượt mượn bắt đầu khi nhân viên xác nhận bàn giao.',
    ],
    [
      'Một lần tôi có thể mượn bao nhiêu cuốn, trong bao lâu?',
      settings
        ? `Theo chính sách hiện tại, mỗi thành viên được mượn tối đa ${settings.max_books} cuốn cùng lúc. Thời gian mặc định là ${settings.loan_days} ngày kể từ khi nhận sách. Bạn luôn có thể xem ngày hẹn cụ thể trong mục Sách của tôi.`
        : 'Hạn mức và thời gian mượn được công bố trong chính sách thư viện. Mỗi phiếu mượn hiển thị ngày hẹn trả cụ thể trong tài khoản.',
    ],
    [
      'Nếu cuốn sách tôi muốn đọc đang được mượn thì sao?',
      settings
        ? `Bạn có thể đặt trước để tham gia hàng chờ. Khi có sách được trả, hệ thống xét người đủ điều kiện theo thứ tự đặt trước và giữ bản sao trong ${settings.hold_hours} giờ. Thông báo nhận sách sẽ xuất hiện trong tài khoản.`
        : 'Bạn có thể tham gia hàng chờ đặt trước. Thư viện sẽ thông báo trong tài khoản khi có bản sao được giữ cho bạn.',
    ],
    [
      'Tôi có thể gia hạn sách trực tuyến không?',
      'Có. Vào mục Sách của tôi để gửi yêu cầu khi phiếu đang mượn chưa quá hạn. Thư viện sẽ xem xét số lần gia hạn và hàng chờ đặt trước. Yêu cầu chỉ có hiệu lực sau khi được phê duyệt; hãy kiểm tra ngày hẹn mới trong tài khoản.',
    ],
    [
      'Nếu trả sách trễ hoặc làm hư sách thì xử lý thế nào?',
      settings
        ? `Phí trễ hạn hiện được cấu hình ${money(settings.fine_per_day)} mỗi ngày tính phí, có thể áp dụng ân hạn và mức trần theo chính sách. Nhân viên xác nhận tình trạng và khoản phí khi bạn trả sách. Chi tiết dư nợ, thanh toán và miễn giảm được hiển thị trong tài khoản.`
        : 'Vui lòng liên hệ thư viện để được hướng dẫn. Nhân viên ghi nhận tình trạng, phí phát sinh và biên nhận; bạn có thể theo dõi trong mục Phí phạt của tôi.',
    ],
    [
      'Làm thế nào để gửi một đánh giá về sách?',
      'Sau khi đã mượn và trả cuốn sách, mở trang chi tiết để chấm điểm và chia sẻ cảm nhận. Mỗi thành viên có một đánh giá hiện hành cho mỗi đầu sách và có thể cập nhật cảm nhận của mình.',
    ],
  ]
  return (
    <section className="container home-faq-section">
      <Reveal className="home-faq-intro">
        <span className="eyebrow">MỘT VÀI ĐIỀU BẠN CÓ THỂ MUỐN BIẾT</span>
        <h2>
          Trước trang sách
          <br />
          <em>đầu tiên.</em>
        </h2>
        <p>
          Từ một lần đăng ký đến một cuộc hẹn trả sách. Những thông tin nhỏ để bạn bắt đầu thật
          thoải mái.
        </p>
        <Link to="/policy" className="text-link">
          Đọc chính sách đầy đủ
          <ArrowUpRight size={15} />
        </Link>
        {settings?.contact_email && (
          <div className="faq-contact">
            <Mail size={23} />
            <div>
              <strong>Vẫn còn điều muốn hỏi?</strong>
              <a href={'mailto:' + settings.contact_email}>
                {settings.contact_email}
                <ArrowUpRight size={13} />
              </a>
            </div>
          </div>
        )}
      </Reveal>
      <div className="home-faq-list">
        {questions.map(([q, a], i) => (
          <details key={q} name="librivo-faq">
            <summary>
              <span>{String(i + 1).padStart(2, '0')}</span>
              <strong>{q}</strong>
              <ChevronDown size={17} />
            </summary>
            <div>
              <p>{a}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
