import { useEffect, useState } from 'react'
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  Sun,
  Moon,
  ArrowUpRight,
  BookOpen,
  LayoutDashboard,
  LibraryBig,
  Users,
  ArrowLeftRight,
  CalendarClock,
  Heart,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  FolderOpen,
  UserRound,
  ChartNoAxesCombined,
  Shield,
  History,
  Wallet,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  Clock,
  CheckCheck,
} from 'lucide-react'
import { Logo, SearchInput, useDebounce, Empty } from '../components/common'
import { Button } from '../components/ui/button'
import { Modal } from '../components/ui/dialog'
import { get } from '../lib/api'
import { useAuth } from '../app/auth'
export function ThemeToggle() {
  const [dark, setDark] = useState(() => localStorage.getItem('librivo-theme') === 'dark')
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('librivo-theme', dark ? 'dark' : 'light')
  }, [dark])
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setDark(!dark)}
      aria-label={dark ? 'Chế độ sáng' : 'Chế độ tối'}
      title={dark ? 'Chế độ sáng' : 'Chế độ tối'}
    >
      {dark ? <Sun size={19} /> : <Moon size={19} />}
    </Button>
  )
}
function CommandSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [s, setS] = useState('')
  const search = useDebounce(s)
  const { data, isFetching } = useQuery({
    queryKey: ['command', search],
    queryFn: () => get('/books', { search, per_page: 6 }),
    enabled: open && search.length > 1,
  })
  return (
    <Modal open={open} onClose={onClose} title="Tìm trong thư viện">
      <SearchInput value={s} onChange={setS} placeholder="Tên sách, tác giả hoặc ISBN…" />
      {search.length > 1 ? (
        <div className="command-results">
          {isFetching ? (
            <p>Đang tìm kiếm…</p>
          ) : data?.data.length ? (
            data.data.map((b: any) => (
              <Link key={b.id} to={'/books/' + b.id} onClick={onClose}>
                <BookOpen size={18} />
                <div>
                  <strong>{b.title}</strong>
                  <small>{b.authors.map((a: any) => a.name).join(', ')}</small>
                </div>
                <ArrowUpRight size={16} />
              </Link>
            ))
          ) : (
            <Empty
              title="Chưa tìm thấy sách"
              description="Thử tên tác giả hoặc một từ khóa khác."
            />
          )}
        </div>
      ) : (
        <p className="muted command-hint">
          Nhập ít nhất 2 ký tự để tìm kiếm trong toàn bộ thư viện.
        </p>
      )}
    </Modal>
  )
}
export function PublicLayout() {
  const { user, can, logout } = useAuth()
  const [menu, setMenu] = useState(false)
  const [command, setCommand] = useState(false)
  const location = useLocation()
  useEffect(() => {
    setMenu(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommand((v) => !v)
      }
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [])
  return (
    <>
      <header className="public-header">
        <div className="public-nav container">
          <Logo />
          <nav className={menu ? 'public-links open' : 'public-links'}>
            <NavLink end to="/">
              Trang chủ
            </NavLink>
            <NavLink to="/catalog">Khám phá sách</NavLink>
            <NavLink to="/categories">Danh mục</NavLink>
            <a href="/#about">
              Về LIBRIVO <ArrowUpRight size={12} />
            </a>
          </nav>
          <div className="nav-actions">
            <button
              className="command-button"
              onClick={() => setCommand(true)}
              aria-label="Tìm kiếm nhanh"
            >
              <Search size={18} />
              <kbd>⌘ K</kbd>
            </button>
            <ThemeToggle />
            <span className="nav-divider" />
            {user ? (
              <>
                <Link className="user-nav" to={can('dashboard.view') ? '/admin' : '/reader'}>
                  <span className="avatar">{user.name.split(' ').slice(-1)[0][0]}</span>
                  <span>
                    {user.name}
                    <ChevronDown size={13} />
                  </span>
                </Link>
                <button
                  className="icon-logout"
                  onClick={logout}
                  title="Đăng xuất"
                  aria-label="Đăng xuất"
                >
                  <LogOut size={17} />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-login">
                  Đăng nhập
                </Link>
                <Button asChild size="sm">
                  <Link to="/register">
                    Trở thành thành viên
                    <ArrowUpRight size={15} />
                  </Link>
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="mobile-menu-btn"
              onClick={() => setMenu(!menu)}
              aria-label="Mở menu"
              aria-expanded={menu}
            >
              {menu ? <X size={21} /> : <Menu size={21} />}
            </Button>
          </div>
        </div>
      </header>
      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <CommandSearch open={command} onClose={() => setCommand(false)} />
    </>
  )
}
function Footer() {
  const { data } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => get('/public/settings'),
  })
  const s = data?.data
  return (
    <footer className="footer">
      <div className="container footer-top">
        <div>
          <Logo />
          <p>
            Một thế giới trong từng trang sách.
            <br />
            Kết nối tri thức. Nuôi dưỡng đam mê.
          </p>
        </div>
        <div>
          <h4>Khám phá</h4>
          <Link to="/catalog">Thư viện sách</Link>
          <Link to="/categories">Danh mục</Link>
          <Link to="/catalog?sort=popular">Được yêu thích</Link>
        </div>
        <div>
          <h4>Dành cho bạn</h4>
          <Link to="/reader/loans">Sách đang mượn</Link>
          <Link to="/reader/favorites">Tủ sách yêu thích</Link>
          <Link to="/register">Đăng ký thành viên</Link>
        </div>
        <div>
          <h4>Ghé thăm thư viện</h4>
          <p>{s?.opening_hours || 'Thứ 2 – Thứ 7: 08:00 – 20:00'}</p>
          <a href={'mailto:' + (s?.contact_email || 'hello@librivo.local')}>
            {s?.contact_email || 'hello@librivo.local'}
          </a>
          <p>{s?.address}</p>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} LIBRIVO. All rights reserved.</span>
        <span>
          Được tạo nên từ tình yêu với sách <span className="purple">♡</span>
        </span>
        <a href="/policy">
          Chính sách thư viện
          <ArrowUpRight size={13} />
        </a>
      </div>
    </footer>
  )
}
const adminNav = [
  {
    group: 'KHÔNG GIAN LÀM VIỆC',
    items: [
      ['/admin', 'Tổng quan', LayoutDashboard, 'dashboard.view'],
      ['/admin/books', 'Quản lý sách', LibraryBig, 'books.update'],
      ['/admin/copies', 'Bản sao & kho sách', Layers, 'books.update'],
      ['/admin/categories', 'Danh mục', FolderOpen, 'taxonomy.manage'],
      ['/admin/authors', 'Tác giả', UserRound, 'taxonomy.manage'],
      ['/admin/publishers', 'Nhà xuất bản', BookOpen, 'taxonomy.manage'],
      ['/admin/shelves', 'Kệ sách', LibraryBig, 'taxonomy.manage'],
    ],
  },
  {
    group: 'HOẠT ĐỘNG THƯ VIỆN',
    items: [
      ['/admin/requests', 'Yêu cầu mượn', Clock, 'loans.approve'],
      ['/admin/loans', 'Mượn & trả sách', ArrowLeftRight, 'loans.return'],
      ['/admin/renewals', 'Gia hạn', CalendarClock, 'loans.approve'],
      ['/admin/reservations', 'Đặt trước', CheckCheck, 'loans.approve'],
      ['/admin/members', 'Thành viên', Users, 'members.manage'],
      ['/admin/fines', 'Phí phạt', Wallet, 'fines.collect'],
      ['/admin/reports', 'Báo cáo & thống kê', ChartNoAxesCombined, 'reports.view'],
    ],
  },
  {
    group: 'HỆ THỐNG',
    items: [
      ['/admin/roles', 'Vai trò & quyền hạn', Shield, 'roles.manage'],
      ['/admin/settings', 'Cấu hình thư viện', Settings, 'settings.manage'],
      ['/admin/audit', 'Nhật ký hệ thống', History, 'audit.view'],
    ],
  },
] as const
const readerNav = [
  {
    group: 'KHÔNG GIAN CỦA BẠN',
    items: [
      ['/reader', 'Tổng quan', LayoutDashboard, ''],
      ['/reader/loans', 'Sách của tôi', BookOpen, ''],
      ['/reader/reservations', 'Đặt trước', CalendarClock, ''],
      ['/reader/favorites', 'Sách yêu thích', Heart, ''],
      ['/reader/reviews', 'Đánh giá của tôi', CheckCheck, ''],
      ['/reader/fines', 'Phí phạt', Wallet, ''],
      ['/reader/notifications', 'Thông báo', Bell, ''],
      ['/reader/profile', 'Hồ sơ cá nhân', UserRound, ''],
    ],
  },
] as const
export function WorkspaceLayout({ reader = false }: { reader?: boolean }) {
  const { user, can, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [command, setCommand] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    const f = () => {
      if (innerWidth < 768) setCollapsed(false)
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobile(false)
    }
    f()
    window.addEventListener('resize', f)
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('resize', f)
      window.removeEventListener('keydown', key)
    }
  }, [])
  const groups: ReadonlyArray<{
    group: string
    items: ReadonlyArray<readonly [string, string, typeof BookOpen, string]>
  }> = reader ? readerNav : adminNav
  const current =
    groups.flatMap((g) => g.items).find((n) => n[0] === location.pathname)?.[1] || 'Thư viện'
  const { data: summary } = useQuery({
    queryKey: ['reader-summary'],
    queryFn: () => get('/me/summary'),
    enabled: !!user,
  })
  useEffect(() => {
    setMobile(false)
    window.scrollTo(0, 0)
  }, [location.pathname])
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommand((v) => !v)
      }
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [])
  return (
    <div className={'workspace ' + (collapsed ? 'sidebar-collapsed' : '')}>
      {mobile && (
        <button
          className="sidebar-backdrop"
          onClick={() => setMobile(false)}
          aria-label="Đóng menu"
        />
      )}
      <motion.aside
        className={'sidebar ' + (mobile ? 'mobile-open' : '')}
        animate={{ width: collapsed ? 82 : 250 }}
        transition={{ duration: 0.22 }}
      >
        <div className="sidebar-logo">
          <Logo compact={collapsed} />
          <button
            className="sidebar-close-mobile"
            onClick={() => setMobile(false)}
            aria-label="Đóng menu"
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-switch">
          <span className="workspace-initial">L</span>
          {!collapsed && (
            <>
              <div>
                <strong>Thư viện LIBRIVO</strong>
                <small>{reader ? 'Không gian độc giả' : 'Library workspace'}</small>
              </div>
              <ChevronDown size={14} />
            </>
          )}
        </div>
        <nav className="sidebar-nav">
          {groups.map((g) => (
            <div className="nav-group" key={g.group}>
              {!collapsed && <span className="nav-group-label">{g.group}</span>}
              {g.items
                .filter((n) => !n[3] || can(n[3]))
                .map(([url, label, Icon]) => (
                  <NavLink key={url} to={url} end title={collapsed ? label : undefined}>
                    <Icon size={18} />
                    {!collapsed && <span>{label}</span>}
                    {url === '/reader/notifications' && !collapsed && !!summary?.data?.unread && (
                      <b className="nav-badge">{summary.data.unread}</b>
                    )}
                  </NavLink>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {!collapsed && (
            <div className="sidebar-note">
              <div className="note-icon">
                <BookOpen size={20} />
                <span>✧</span>
              </div>
              <strong>Một chương mới mỗi ngày.</strong>
              <p>Tri thức bắt đầu từ sự tò mò.</p>
              <Link to="/catalog">
                Khám phá thư viện <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
          <Link to="/" className="sidebar-public">
            <ArrowUpRight size={17} />
            {!collapsed && 'Đến thư viện công khai'}
          </Link>
          <div className="sidebar-user">
            <span className="avatar">{user?.name.split(' ').slice(-1)[0][0]}</span>
            {!collapsed && (
              <div>
                <strong>{user?.name}</strong>
                <small>{user?.roles[0]}</small>
              </div>
            )}
            <button
              onClick={async () => {
                await logout()
                navigate('/')
              }}
              title="Đăng xuất"
              aria-label="Đăng xuất"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </motion.aside>
      <div className="workspace-main">
        <header className="workspace-topbar">
          <div className="topbar-start">
            <button
              className="sidebar-toggle desktop-toggle"
              onClick={() => setCollapsed(!collapsed)}
              aria-label="Thu gọn thanh bên"
            >
              {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            </button>
            <button
              className="sidebar-toggle mobile-menu-btn"
              onClick={() => setMobile(true)}
              aria-label="Mở menu"
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb">
              {reader ? 'Không gian của tôi' : 'Không gian làm việc'}
              <span>/</span>
              <strong>{current}</strong>
            </span>
          </div>
          <div className="topbar-actions">
            <button className="topbar-search" onClick={() => setCommand(true)}>
              <Search size={16} />
              <span>Tìm sách, tác giả…</span>
              <kbd>⌘ K</kbd>
            </button>
            <ThemeToggle />
            <Link className="notification-icon" to="/reader/notifications" aria-label="Thông báo">
              <Bell size={19} />
              {!!summary?.data?.unread && <i />}
            </Link>
            <span className="avatar small-avatar">{user?.name.split(' ').slice(-1)[0][0]}</span>
          </div>
        </header>
        <main className="workspace-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
        <footer className="workspace-footer">
          <span>© {new Date().getFullYear()} LIBRIVO · Smart Library Management</span>
          <span>
            <i /> Kết nối thư viện
          </span>
        </footer>
      </div>
      <CommandSearch open={command} onClose={() => setCommand(false)} />
    </div>
  )
}
