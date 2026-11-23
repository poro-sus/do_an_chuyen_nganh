import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { Toaster } from 'sonner'
import { ArrowRight, BookOpen, ShieldAlert } from 'lucide-react'
import { AuthProvider, Guard } from './app/auth'
import { PublicLayout, WorkspaceLayout } from './layouts/Layouts'
import { Button } from './components/ui/button'
const Home = lazy(() => import('./pages/Home'))
const Catalog = lazy(() => import('./pages/Catalog'))
const CategoriesPage = lazy(() =>
  import('./pages/Catalog').then((m) => ({ default: m.CategoriesPage })),
)
const Policy = lazy(() => import('./pages/Policy'))
const BookDetail = lazy(() => import('./pages/BookDetail'))
const Auth = lazy(() => import('./pages/Auth'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ReaderDashboard = lazy(() =>
  import('./pages/Dashboard').then((m) => ({ default: m.ReaderDashboard })),
)
const Circulation = lazy(() => import('./pages/Circulation'))
const Books = lazy(() => import('./pages/BooksAdmin'))
const Copies = lazy(() => import('./pages/Copies'))
const Taxonomy = lazy(() => import('./pages/Taxonomy'))
const Members = lazy(() => import('./pages/Members'))
const Reports = lazy(() => import('./pages/Reports'))
const Roles = lazy(() => import('./pages/System').then((m) => ({ default: m.Roles })))
const Settings = lazy(() => import('./pages/System').then((m) => ({ default: m.Settings })))
const AuditLogs = lazy(() => import('./pages/System').then((m) => ({ default: m.AuditLogs })))
const Notifications = lazy(() =>
  import('./pages/Reader').then((m) => ({ default: m.Notifications })),
)
const Profile = lazy(() => import('./pages/Reader').then((m) => ({ default: m.Profile })))
const MyReviews = lazy(() => import('./pages/Reader').then((m) => ({ default: m.MyReviews })))
const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000, refetchOnWindowFocus: false } },
})
function DocumentTitle() {
  const l = useLocation()
  useEffect(() => {
    document.title =
      'LIBRIVO — ' +
      (l.pathname.startsWith('/admin')
        ? 'Không gian quản trị'
        : l.pathname.startsWith('/reader')
          ? 'Không gian của bạn'
          : 'Một thế giới trong từng trang sách')
  }, [l.pathname])
  return null
}
function ErrorPage({ forbidden = false }: { forbidden?: boolean }) {
  return (
    <div className="error-page container">
      <span className="error-code">{forbidden ? '403' : '404'}</span>
      {forbidden ? <ShieldAlert size={42} /> : <BookOpen size={42} />}
      <h1>{forbidden ? 'Cánh cửa này cần đúng chìa khóa.' : 'Trang sách này chưa được viết.'}</h1>
      <p>
        {forbidden
          ? 'Tài khoản của bạn chưa có quyền truy cập khu vực này.'
          : 'Có thể đường dẫn đã thay đổi. Thử khám phá một cuốn sách mới nhé.'}
      </p>
      <Button asChild>
        <Link to="/catalog">
          Trở về thư viện
          <ArrowRight size={17} />
        </Link>
      </Button>
    </div>
  )
}
export default function App() {
  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <MotionConfig reducedMotion="user">
          <AuthProvider>
            <DocumentTitle />
            <Suspense
              fallback={
                <div className="page-loading">
                  <div className="spinner" />
                  Đang mở một trang mới…
                </div>
              }
            >
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route index element={<Home />} />
                  <Route path="catalog" element={<Catalog />} />
                  <Route path="categories" element={<CategoriesPage />} />
                  <Route path="policy" element={<Policy />} />
                  <Route path="books/:id" element={<BookDetail />} />
                  <Route path="403" element={<ErrorPage forbidden />} />
                  <Route path="*" element={<ErrorPage />} />
                </Route>
                <Route path="login" element={<Auth />} />
                <Route path="register" element={<Auth mode="register" />} />
                <Route path="forgot-password" element={<Auth mode="forgot" />} />
                <Route path="reset-password" element={<Auth mode="reset" />} />
                <Route
                  path="admin"
                  element={
                    <Guard permission="dashboard.view">
                      <WorkspaceLayout />
                    </Guard>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route
                    path="books"
                    element={
                      <Guard permission="books.update">
                        <Books />
                      </Guard>
                    }
                  />
                  <Route
                    path="copies"
                    element={
                      <Guard permission="books.update">
                        <Copies />
                      </Guard>
                    }
                  />
                  {['categories', 'authors', 'publishers', 'shelves'].map((t) => (
                    <Route
                      key={t}
                      path={t}
                      element={
                        <Guard permission="taxonomy.manage">
                          <Taxonomy type={t} />
                        </Guard>
                      }
                    />
                  ))}
                  <Route
                    path="members"
                    element={
                      <Guard permission="members.manage">
                        <Members />
                      </Guard>
                    }
                  />
                  {(['loans', 'requests', 'reservations', 'renewals', 'fines'] as const).map(
                    (t) => (
                      <Route
                        key={t}
                        path={t}
                        element={
                          <Guard permission={t === 'fines' ? 'fines.collect' : 'loans.approve'}>
                            <Circulation kind={t} />
                          </Guard>
                        }
                      />
                    ),
                  )}
                  <Route
                    path="reports"
                    element={
                      <Guard permission="reports.view">
                        <Reports />
                      </Guard>
                    }
                  />
                  <Route
                    path="roles"
                    element={
                      <Guard permission="roles.manage">
                        <Roles />
                      </Guard>
                    }
                  />
                  <Route
                    path="settings"
                    element={
                      <Guard permission="settings.manage">
                        <Settings />
                      </Guard>
                    }
                  />
                  <Route
                    path="audit"
                    element={
                      <Guard permission="audit.view">
                        <AuditLogs />
                      </Guard>
                    }
                  />
                </Route>
                <Route
                  path="reader"
                  element={
                    <Guard>
                      <WorkspaceLayout reader />
                    </Guard>
                  }
                >
                  <Route index element={<ReaderDashboard />} />
                  <Route path="loans" element={<Circulation reader />} />
                  <Route path="reservations" element={<Circulation kind="reservations" reader />} />
                  <Route path="fines" element={<Circulation kind="fines" reader />} />
                  <Route path="favorites" element={<Catalog favorites />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="reviews" element={<MyReviews />} />
                </Route>
              </Routes>
            </Suspense>
            <Toaster
              richColors
              position="bottom-right"
              closeButton
              toastOptions={{ style: { fontFamily: 'inherit', borderRadius: 12 } }}
            />
          </AuthProvider>
        </MotionConfig>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
