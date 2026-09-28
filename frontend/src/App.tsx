import { useState } from 'react'
import type { ReactNode } from 'react'
import CitiesPg from './pages/CitiesPg'
import CategoriesPg from './pages/CategoriesPg'
import PlacesPg from './pages/PlacesPg'
import VisitsPg from './pages/VisitsPg'
import TripPlansPg from './pages/TripPlansPg'

type Tab = 'cities' | 'categories' | 'places' | 'visits' | 'plans'

const TABS: { key: Tab; label: string }[] = [
  { key: 'cities', label: 'Города' },
  { key: 'categories', label: 'Категории' },
  { key: 'places', label: 'Места' },
  { key: 'visits', label: 'Посещения' },
  { key: 'plans', label: 'Планы' },
]

function App() {
  const [tab, setTab] = useState<Tab>('cities')

  let page: ReactNode
  switch (tab) {
    case 'cities':
      page = <CitiesPg />
      break
    case 'categories':
      page = <CategoriesPg />
      break
    case 'places':
      page = <PlacesPg />
      break
    case 'visits':
      page = <VisitsPg />
      break
    case 'plans':
      page = <TripPlansPg />
      break
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">CG</span>
          <span>City Guide</span>
        </div>
        <nav className="tabbar" aria-label="Разделы">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`tab${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="content">{page}</main>
      <footer className="footer">City Guide · FastAPI API + React UI</footer>
    </div>
  )
}

export default App