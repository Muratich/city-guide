import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import type { Category } from '../api'
import { Empty, ErrorNote, Field } from '../ui'

interface CategoryForm {
  name: string
  description: string
}

const emptyForm: CategoryForm = { name: '', description: '' }

export default function CategoriesPg() {
  const [items, setItems] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<CategoryForm | null>(null)
  const [editing, setEditing] = useState<Category | null>(null)

  const refresh = useCallback(async () => {
    try {
      const data = await api.listCategories()
      setItems(data)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await api.listCategories()
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

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
  }

  const openEdit = (c: Category) => {
    setEditing(c)
    setForm({ name: c.name, description: c.description ?? '' })
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
      const body = { name: form.name, description: form.description || null }
      if (editing) await api.updateCategory(editing.id, body)
      else await api.createCategory(body)
      close()
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (c: Category) => {
    if (!window.confirm(`Удалить категорию «${c.name}»?`)) return
    try {
      await api.deleteCategory(c.id)
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <section>
      <div className="page-head">
        <h2>Категории</h2>
        {!form && (
          <button className="btn" onClick={openCreate}>
            Добавить категорию
          </button>
        )}
      </div>
      <ErrorNote message={error} />
      {form && (
        <form className="panel" onSubmit={(e) => void submit(e)}>
          <h3>{editing ? `Редактировать: ${editing.name}` : 'Новая категория'}</h3>
          <div className="form-grid">
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
        <Empty text="Категорий пока нет — добавьте первую." />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Описание</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="muted">{c.description ?? '—'}</td>
                <td className="row-actions">
                  <button className="btn btn-small" onClick={() => openEdit(c)}>
                    Изменить
                  </button>
                  <button className="btn btn-small btn-danger" onClick={() => void remove(c)}>
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