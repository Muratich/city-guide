import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import type { Place, Visit } from '../api'
import { Empty, ErrorNote, Field } from '../ui'
import { fmtDateTime, toDateTimeLocal } from '../format'

interface VisitForm {
  place_id: string
  visited_at: string
  rating: string
  comment: string
}

function formFromVisit(v: Visit): VisitForm {
  return {
    place_id: String(v.place_id),
    visited_at: toDateTimeLocal(v.visited_at),
    rating: String(v.rating),
    comment: v.comment ?? '',
  }
}

const emptyForm: VisitForm = { place_id: '', visited_at: '', rating: '5', comment: '' }

export default function VisitsPg() {
  const [items, setItems] = useState<Visit[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<VisitForm | null>(null)
  const [editing, setEditing] = useState<Visit | null>(null)
  const [fPlace, setFPlace] = useState('')

  const refresh = useCallback(async () => {
    try {
      const data = await api.listVisits()
      setItems(data)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    const loadPlaces = async () => {
      try {
        setPlaces(await api.listPlaces())
      } catch (e) {
        setError((e as Error).message)
      }
    }
    void loadPlaces()
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await api.listVisits()
        if (!cancelled) {
          setItems(data)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const placeName = (id: number) => places.find((p) => p.id === id)?.name ?? `#${id}`
  const visible = fPlace === '' ? items : items.filter((v) => v.place_id === Number(fPlace))

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
  }

  const openEdit = (v: Visit) => {
    setEditing(v)
    setForm(formFromVisit(v))
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
      const body = {
        place_id: Number(form.place_id),
        visited_at: form.visited_at,
        rating: Number(form.rating),
        comment: form.comment || null,
      }
      if (editing) await api.updateVisit(editing.id, body)
      else await api.createVisit(body)
      close()
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (v: Visit) => {
    if (!window.confirm('Удалить визит?')) return
    try {
      await api.deleteVisit(v.id)
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <section>
      <div className="page-head">
        <h2>Посещения</h2>
        {!form && (
          <button className="btn" onClick={openCreate}>
            Добавить визит
          </button>
        )}
      </div>
      <ErrorNote message={error} />

      <div className="filters">
        <label>
          Место
          <select value={fPlace} onChange={(e) => setFPlace(e.target.value)}>
            <option value="">Все</option>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {form && (
        <form className="panel" onSubmit={(e) => void submit(e)}>
          <h3>{editing ? 'Редактировать визит' : 'Новый визит'}</h3>
          <div className="form-grid">
            <Field label="Место" hint="обязательно">
              <select
                required
                value={form.place_id}
                onChange={(e) => setForm({ ...form, place_id: e.target.value })}
              >
                <option value="">— выберите —</option>
                {places.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Когда">
              <input
                required
                type="datetime-local"
                value={form.visited_at}
                onChange={(e) => setForm({ ...form, visited_at: e.target.value })}
              />
            </Field>
            <Field label="Оценка" hint="1 – 5">
              <select
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Комментарий">
              <textarea
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
              />
            </Field>
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

      {items.length === 0 && !error ? (
        <Empty text="Визитов пока нет — добавьте первый." />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Место</th>
              <th>Когда</th>
              <th>Оценка</th>
              <th>Комментарий</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((v) => (
              <tr key={v.id}>
                <td>{placeName(v.place_id)}</td>
                <td>{fmtDateTime(v.visited_at)}</td>
                <td>{v.rating}</td>
                <td className="muted">{v.comment ?? '—'}</td>
                <td className="row-actions">
                  <button className="btn btn-small" onClick={() => openEdit(v)}>
                    Изменить
                  </button>
                  <button className="btn btn-small btn-danger" onClick={() => void remove(v)}>
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}