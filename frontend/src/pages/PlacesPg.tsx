import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import type { City, Category, Place, PlaceQuery, PlaceStats, Visit } from '../api'
import { Empty, ErrorNote, Field } from '../ui'
import { fmtDateTime, priceLabel } from '../format'

interface PlaceForm {
  city_id: string
  category_id: string
  name: string
  address: string
  description: string
  latitude: string
  longitude: string
  price_level: string
  is_favorite: boolean
}

function formFromPlace(p: Place): PlaceForm {
  return {
    city_id: String(p.city_id),
    category_id: String(p.category_id),
    name: p.name,
    address: p.address,
    description: p.description ?? '',
    latitude: p.latitude === null ? '' : String(p.latitude),
    longitude: p.longitude === null ? '' : String(p.longitude),
    price_level: String(p.price_level),
    is_favorite: p.is_favorite,
  }
}

const emptyForm: PlaceForm = {
  city_id: '',
  category_id: '',
  name: '',
  address: '',
  description: '',
  latitude: '',
  longitude: '',
  price_level: '1',
  is_favorite: false,
}

export default function PlacesPg() {
  const [places, setPlaces] = useState<Place[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [fCity, setFCity] = useState('')
  const [fCategory, setFCategory] = useState('')
  const [fFav, setFFav] = useState('')
  const [fMin, setFMin] = useState('')

  const [form, setForm] = useState<PlaceForm | null>(null)
  const [editing, setEditing] = useState<Place | null>(null)

  const [expanded, setExpanded] = useState<number | null>(null)
  const [detail, setDetail] = useState<{ stats: PlaceStats; visits: Visit[] } | null>(null)

  const refresh = useCallback(async () => {
    const q: PlaceQuery = {}
    if (fCity !== '') q.city_id = Number(fCity)
    if (fCategory !== '') q.category_id = Number(fCategory)
    if (fFav !== '') q.is_favorite = fFav === 'true'
    if (fMin !== '') q.min_rating = Number(fMin)
    try {
      const data = await api.listPlaces(q)
      setPlaces(data)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [fCity, fCategory, fFav, fMin])

  useEffect(() => {
    const loadRefs = async () => {
      try {
        const [cs, cats] = await Promise.all([api.listCities(), api.listCategories()])
        setCities(cs)
        setCategories(cats)
      } catch (e) {
        setError((e as Error).message)
      }
    }
    void loadRefs()
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const q: PlaceQuery = {}
      if (fCity !== '') q.city_id = Number(fCity)
      if (fCategory !== '') q.category_id = Number(fCategory)
      if (fFav !== '') q.is_favorite = fFav === 'true'
      if (fMin !== '') q.min_rating = Number(fMin)
      try {
        const data = await api.listPlaces(q)
        if (!cancelled) {
          setPlaces(data)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fCity, fCategory, fFav, fMin])

  const cityName = (id: number) => cities.find((c) => c.id === id)?.name ?? `#${id}`
  const categoryName = (id: number) => categories.find((c) => c.id === id)?.name ?? `#${id}`

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
  }

  const openEdit = (p: Place) => {
    setEditing(p)
    setForm(formFromPlace(p))
  }

  const close = () => {
    setForm(null)
    setEditing(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    setBusy(true)
    setError(null)
    try {
      const lat = form.latitude === '' ? null : Number(form.latitude)
      const lon = form.longitude === '' ? null : Number(form.longitude)
      const body = {
        city_id: Number(form.city_id),
        category_id: Number(form.category_id),
        name: form.name,
        address: form.address,
        description: form.description || null,
        latitude: lat,
        longitude: lon,
        price_level: Number(form.price_level),
        is_favorite: form.is_favorite,
      }
      if (editing) await api.updatePlace(editing.id, body)
      else await api.createPlace(body)
      close()
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (p: Place) => {
    if (!window.confirm(`Удалить место «${p.name}»?`)) return
    try {
      await api.deletePlace(p.id)
      if (expanded === p.id) setExpanded(null)
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const toggleFavorite = async (p: Place) => {
    try {
      await api.updatePlace(p.id, { is_favorite: !p.is_favorite })
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const toggleDetail = async (p: Place) => {
    if (expanded === p.id) {
      setExpanded(null)
      setDetail(null)
      return
    }
    setExpanded(p.id)
    setDetail(null)
    try {
      const [stats, visits] = await Promise.all([api.getPlaceStats(p.id), api.getPlaceVisits(p.id)])
      setDetail({ stats, visits })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <section>
      <div className="page-head">
        <h2>Места</h2>
        {!form && (
          <button className="btn" onClick={openCreate}>
            Добавить место
          </button>
        )}
      </div>
      <ErrorNote message={error} />

      <div className="filters">
        <label>
          Город
          <select value={fCity} onChange={(e) => setFCity(e.target.value)}>
            <option value="">Все</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Категория
          <select value={fCategory} onChange={(e) => setFCategory(e.target.value)}>
            <option value="">Все</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          В избранном
          <select value={fFav} onChange={(e) => setFFav(e.target.value)}>
            <option value="">Все</option>
            <option value="true">Да</option>
            <option value="false">Нет</option>
          </select>
        </label>
        <label>
          Мин. рейтинг
          <input
            type="number"
            min={1}
            max={5}
            step={0.5}
            value={fMin}
            onChange={(e) => setFMin(e.target.value)}
            placeholder="напр. 4.5"
          />
        </label>
      </div>

      {form && (
        <form className="panel" onSubmit={(e) => void submit(e)}>
          <h3>{editing ? `Редактировать: ${editing.name}` : 'Новое место'}</h3>
          <div className="form-grid">
            <Field label="Город" hint="обязательно">
              <select
                required
                value={form.city_id}
                onChange={(e) => setForm({ ...form, city_id: e.target.value })}
              >
                <option value="">— выберите —</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Категория" hint="обязательно">
              <select
                required
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              >
                <option value="">— выберите —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Название">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Адрес">
              <input
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Field>
            <Field label="Описание">
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <Field label="Широта" hint="-90 … 90">
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              />
            </Field>
            <Field label="Долгота" hint="-180 … 180">
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              />
            </Field>
            <Field label="Ценовой уровень">
              <select
                value={form.price_level}
                onChange={(e) => setForm({ ...form, price_level: e.target.value })}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {priceLabel(n)} ({n})
                  </option>
                ))}
              </select>
            </Field>
            <label className="field checbox-field">
              <input
                type="checkbox"
                checked={form.is_favorite}
                onChange={(e) => setForm({ ...form, is_favorite: e.target.checked })}
              />
              <span>В избранном</span>
            </label>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Сохранение…' : 'Сохранить'}
            </button>
            <button type="button" className="btn" onClick={close}>
              Отмена
            </button>
          </div>
        </form>
      )}

      {places.length === 0 && !error ? (
        <Empty text="Мест пока нет — добавьте первое." />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Город</th>
              <th>Категория</th>
              <th>Цена</th>
              <th>Статистика</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {places.map((p) => (
              <PlaceRow
                key={p.id}
                place={p}
                cityName={cityName}
                categoryName={categoryName}
                expanded={expanded === p.id}
                detail={detail}
                onToggle={() => void toggleDetail(p)}
                onEdit={() => openEdit(p)}
                onDelete={() => void remove(p)}
                onToggleFavorite={() => void toggleFavorite(p)}
              />
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function PlaceRow({
  place,
  cityName,
  categoryName,
  expanded,
  detail,
  onToggle,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  place: Place
  cityName: (id: number) => string
  categoryName: (id: number) => string
  expanded: boolean
  detail: { stats: PlaceStats; visits: Visit[] } | null
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleFavorite: () => void
}) {
  return (
    <>
      <tr className={expanded ? 'expanded' : undefined}>
        <td>
          {place.name}
          {place.is_favorite ? <span className="badge badge-fav">в избранном</span> : null}
        </td>
        <td>{cityName(place.city_id)}</td>
        <td>{categoryName(place.category_id)}</td>
        <td>{priceLabel(place.price_level)}</td>
        <td>
          <button className="btn btn-small" onClick={onToggle}>
            {expanded ? 'Скрыть' : 'Показать'}
          </button>
          {expanded && detail ? (
            <span className="inline-stats">
              визитов: {detail.stats.visit_count}
              {detail.stats.avg_rating !== null ? `, рейтинг: ${detail.stats.avg_rating.toFixed(1)}` : ''}
            </span>
          ) : null}
        </td>
        <td className="row-actions">
          <button className="btn btn-small" onClick={onToggleFavorite}>
            {place.is_favorite ? 'Убрать из избранного' : 'В избранное'}
          </button>
          <button className="btn btn-small" onClick={onEdit}>
            Изменить
          </button>
          <button className="btn btn-small btn-danger" onClick={onDelete}>
            Удалить
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="detail-row">
          <td colSpan={6}>
            {!detail ? (
              <em>Загрузка…</em>
            ) : (
              <div className="detail-box">
                <p>
                  Визитов: <strong>{detail.stats.visit_count}</strong>
                  {detail.stats.avg_rating !== null ? (
                    <>
                      , средний рейтинг:{' '}
                      <strong>{detail.stats.avg_rating.toFixed(1)}</strong> из 5
                    </>
                  ) : (
                    ', оценок пока нет'
                  )}
                </p>
                {detail.visits.length === 0 ? (
                  <p className="muted">Визитов не зафиксировано.</p>
                ) : (
                  <table className="table table-inner">
                    <thead>
                      <tr>
                        <th>Когда</th>
                        <th>Оценка</th>
                        <th>Комментарий</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.visits.map((v) => (
                        <tr key={v.id}>
                          <td>{fmtDateTime(v.visited_at)}</td>
                          <td>{v.rating}</td>
                          <td className="muted">{v.comment ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            <div className="detail-actions">
              <button className="btn btn-small" onClick={onEdit}>
                Редактировать место
              </button>
              <button className="btn btn-small btn-danger" onClick={onDelete}>
                Удалить место
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}