import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Page } from './components/Layout'
import { Skeleton } from './components/ui'
import Story from './story/Story'

const Explore = lazy(() => import('./explore/Explore'))
const Country = lazy(() => import('./pages/Country'))
const Firm = lazy(() => import('./pages/Firm'))
const Methods = lazy(() => import('./pages/Methods'))
const Scenarios = lazy(() => import('./pages/Scenarios'))
const Present = lazy(() => import('./pages/Present'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (pathname !== '/') window.scrollTo(0, 0)
  }, [pathname])
  return null
}

const Loading = () => (
  <div className="container" style={{ paddingTop: 96 }}>
    <Skeleton height={48} style={{ maxWidth: 480, marginBottom: 24 }} />
    <Skeleton height={360} />
  </div>
)

export default function App() {
  // Presentation mode: ?present=1 (outside the hash) or #/present
  const present = new URLSearchParams(window.location.search).get('present') === '1'
  return (
    <HashRouter>
      <ScrollToTop />
      <Suspense fallback={<Loading />}>
        {present ? (
          <Present />
        ) : (
          <Routes>
            <Route path="/" element={<Page><Story /></Page>} />
            <Route path="/explore" element={<Page><Explore /></Page>} />
            <Route path="/country/:iso3" element={<Page><Country /></Page>} />
            <Route path="/firm/:slug" element={<Page><Firm /></Page>} />
            <Route path="/methods" element={<Page><Methods /></Page>} />
            <Route path="/scenarios" element={<Page><Scenarios /></Page>} />
            <Route path="/present" element={<Present />} />
            <Route path="*" element={<Page><div className="narrow" style={{ padding: '20vh 0' }}><h1>Not found</h1></div></Page>} />
          </Routes>
        )}
      </Suspense>
    </HashRouter>
  )
}
