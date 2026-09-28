import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import type { City, Place, TripItem, TripPlan } from '../api'
import { Empty, ErrorNote, Field } from '../ui'
import { fmtDate } from '../format'

interface PlanForm {
  city_id: string
  name: string
  description: string
  start_date: string
  end_date: string
}

function formFromPlan(p: TripPlan): PlanForm {
  return {
    city_id: String(p.city_id),
    name: p.name,
    description: p.description ?? '',
    start_date: p.start_date ?? '',
    end_date: p.end_date ?? '',
  }
}

const emptyPlanForm: PlanForm = {
  city_id: '',
  name: '',
  description: '',
  start_date: '',
  end_date: '',
}

interface ItemForm {
  place_id: string
  visit_date: string
  start_time: string
  end_time: string
  notes: string
}

const emptyItemForm: ItemForm = {
  place_id: '',
  visit_date: '',
  start_time: '',
  end_time: '',
  notes: '',
}

export default function TripPlansPg() {
  const [plans, setPlans] = useState<TripPlan[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<PlanForm | null>(null)
  const [editing, setEditing] = useState<TripPlan | null>(null)

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [items, setItems] = useState<TripItem[] | null>(null)
  const [itemForm, setItemForm] = useState<ItemForm | null>(null)

  const refresh = useCallback(async () => {
    try {
      const data = await api.listTripPlans()
      setPlans(data)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    const loadRefs = async () => {
      try {
        const [cs, ps] = await Promise.all([api.listCities(), api.listPlaces()])
        setCities(cs)
        setPlaces(ps)
      } catch (e) {
        setError((e as Error).message)
      }
    }
    void loadRefs()
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await api.listTripPlans()
        if (!cancelled) {
          setPlans(data)
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

  const cityName = (id: number) => cities.find((c) => c.id === id)?.name ?? `#${id}`
  const placeName = (id: number) => places.find((p) => p.id === id)?.name ?? `#${id}`
  const placeCity = (id: number) => {
    const p = places.find((el) => el.id === id)
    return p ? cityName(p.city_id) : ''
  }

  const loadItems = useCallback(async (planId: number) => {
    try {
      setItems(null)
      const list = await api.listTripPlanItems(planId)
      setItems([...list].sort((a, b) => a.position - b.position))
    } catch (e) {
      setError((e as Error).message)
      setItems([])
    }
  }, [])

  const toggleExpand = async (plan: TripPlan) => {
    if (expandedId === plan.id) {
      setExpandedId(null)
      setItems(null)
      setItemForm(null)
      return
    }
    setExpandedId(plan.id)
    setItemForm(emptyItemForm)
    await loadItems(plan.id)
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyPlanForm)
  }

  const openEdit = (p: TripPlan) => {
    setEditing(p)
    setForm(formFromPlan(p))
  }

  const close = () => {
    setForm(null)
    setEditing(null)
  }

  const submitPlan = async (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    setBusy(true)
    setError(null)
    try {
      const body = {
        city_id: Number(form.city_id),
        name: form.name,
        description: form.description || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      }
      if (editing) await api.updateTripPlan(editing.id, body)
      else await api.createTripPlan(body)
      close()
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const removePlan = async (p: TripPlan) => {
    if (!window.confirm(`Удалить план «${p.name}»?`)) return
    try {
      await api.deleteTripPlan(p.id)
      if (expandedId === p.id) {
        setExpandedId(null)
        setItems(null)
        setItemForm(null)
      }
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const submitItem = async (e: FormEvent) => {
    e.preventDefault()
    if (!itemForm || expandedId === null) return
    setBusy(true)
    setError(null)
    try {
      await api.createTripItem({
        trip_plan_id: expandedId,
        place_id: Number(itemForm.place_id),
        visit_date: itemForm.visit_date || null,
        start_time: itemForm.start_time || null,
        end_time: itemForm.end_time || null,
        notes: itemForm.notes || null,
      })
      setItemForm(emptyItemForm)
      await loadItems(expandedId)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const removeItem = async (item: TripItem) => {
    if (!window.confirm('Удалить пункт плана?')) return
    try {
      await api.deleteTripItem(item.id)
      if (expandedId !== null) await loadItems(expandedId)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <section>
      <div className="page-head">
        <h2>Планы поездок</h2>
        {!form && (
          <button className="btn" onClick={openCreate}>
            Создать план
          </button>
        )}
      </div>
      <ErrorNote message={error} />

      {form && (
        <form className="panel" onSubmit={(e) => void submitPlan(e)}>
          <h3>{editing ? `Редактировать: ${editing.name}` : 'Новый план'}</h3>
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
            <Field label="Название">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Описание">
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <Field label="Дата начала">
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </Field>
            <Field label="Дата конца">
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
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

      {plans.length === 0 && !error ? (
        <Empty text="Планов пока нет — создайте первый." />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Город</th>
              <th>Датировка</th>
              <th>Пунктов</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <PlanRow
                key={p.id}
                plan={p}
                cityName={cityName}
                itemCount={expandedId === p.id ? (items?.length ?? 0) : null}
                expanded={expandedId === p.id}
                onToggle={() => void toggleExpand(p)}
                onEdit={() => openEdit(p)}
                onDelete={() => void removePlan(p)}
              />
            ))}
          </tbody>
        </table>
      )}

      {expandedId !== null && (
        <div className="panel items-panel">
          <h3>Пункты плана: {plans.find((p) => p.id === expandedId)?.name}</h3>
          {items === null ? (
            <em>Загрузка…</em>
          ) : items.length === 0 ? (
            <p className="muted">Пунктов ещё нет.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Место</th>
                  <th>Дата</th>
                  <th>Время</th>
                  <th>Заметки</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.position}</td>
                    <td>
                      {placeName(it.place_id)}
                      <span className="muted"> ({placeCity(it.place_id)})</span>
                    </td>
                    <td>{fmtDate(it.visit_date)}</td>
                    <td>
                      {it.start_time ?? '—'} – {it.end_time ?? '—'}
                    </td>
                    <td className="muted">{it.notes ?? '—'}</td>
                    <td className="row-actions">
                      <button className="btn btn-small btn-danger" onClick={() => void removeItem(it)}>
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {itemForm && (
            <form className="panel item-form" onSubmit={(e) => void submitItem(e)}>
              <h4>Добавить пункт</h4>
              <div className="form-grid">
                <Field label="Место" hint="должно быть в городе плана">
                  <select
                    required
                    value={itemForm.place_id}
                    onChange={(e) => setItemForm({ ...itemForm, place_id: e.target.value })}
                  >
                    <option value="">— выберите —</option>
                    {places.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({cityName(p.city_id)})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Дата">
                  <input
                    type="date"
                    value={itemForm.visit_date}
                    onChange={(e) => setItemForm({ ...itemForm, visit_date: e.target.value })}
                  />
                </Field>
                <Field label="Начало">
                  <input
                    type="time"
                    value={itemForm.start_time}
                    onChange={(e) => setItemForm({ ...itemForm, start_time: e.target.value })}
                  />
                </Field>
                <Field label="Конец">
                  <input
                    type="time"
                    value={itemForm.end_time}
                    onChange={(e) => setItemForm({ ...itemForm, end_time: e.target.value })}
                  />
                </Field>
                <Field label="Заметки">
                  <input
                    value={itemForm.notes}
                    onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                  />
                </Field>
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" disabled={busy}>
                  {busy ? 'Добавление…' : 'Добавить'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  )
}

function PlanRow({
  plan,
  cityName,
  itemCount,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  plan: TripPlan
  cityName: (id: number) => string
  itemCount: number | null
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <tr className={expanded ? 'expanded' : undefined}>
      <td>{plan.name}</td>
      <td>{cityName(plan.city_id)}</td>
      <td className="muted">
        {fmtDate(plan.start_date)} – {fmtDate(plan.end_date)}
      </td>
      <td>{itemCount === null ? '—' : itemCount}</td>
      <td className="row-actions">
        <button className="btn btn-small" onClick={onToggle}>
          {expanded ? 'Скрыть пункты' : 'Показать пункты'}
        </button>
        <button className="btn btn-small" onClick={onEdit}>
          Изменить
        </button>
        <button className="btn btn-small btn-danger" onClick={onDelete}>
          Удалить
        </button>
      </td>
    </tr>
  )
}