const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:8000/api'

export interface City {
  id: number
  name: string
  country: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface Place {
  id: number
  city_id: number
  category_id: number
  name: string
  address: string
  description: string | null
  latitude: number | null
  longitude: number | null
  price_level: number
  is_favorite: boolean
  created_at: string
  updated_at: string
}

export interface Visit {
  id: number
  place_id: number
  visited_at: string
  rating: number
  comment: string | null
  created_at: string
  updated_at: string
}

export interface TripPlan {
  id: number
  city_id: number
  name: string
  description: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export interface TripItem {
  id: number
  trip_plan_id: number
  place_id: number
  visit_date: string | null
  start_time: string | null
  end_time: string | null
  notes: string | null
  position: number
}

export interface PlaceStats {
  place_id: number
  visit_count: number
  avg_rating: number | null
}

export interface PlaceQuery {
  city_id?: number
  category_id?: number
  is_favorite?: boolean
  min_rating?: number
}

interface RequestOptions {
  method?: string
  body?: unknown
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const init: RequestInit = { method: options.method ?? 'GET', headers: {} }
  if (options.body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' }
    init.body = JSON.stringify(options.body)
  }
  const res = await fetch(API_URL + path, init)
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const data = (await res.json()) as { detail?: unknown }
      if (typeof data.detail === 'string') {
        detail = data.detail
      } else if (Array.isArray(data.detail)) {
        detail = (data.detail as { loc?: (string | number)[]; msg?: string }[])
          .map((d) => `${(d.loc ?? []).join('.')}: ${d.msg ?? 'invalid'}`)
          .join('; ')
      }
    } catch {
      // non-JSON error body
    }
    throw new Error(detail)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  listCities: () => request<City[]>('/cities'),
  createCity: (body: { name: string; country: string; description?: string | null }) =>
    request<City>('/cities', { method: 'POST', body }),
  updateCity: (id: number, body: { name?: string; country?: string; description?: string | null }) =>
    request<City>(`/cities/${id}`, { method: 'PATCH', body }),
  deleteCity: (id: number) => request<void>(`/cities/${id}`, { method: 'DELETE' }),

  listCategories: () => request<Category[]>('/categories'),
  createCategory: (body: { name: string; description?: string | null }) =>
    request<Category>('/categories', { method: 'POST', body }),
  updateCategory: (id: number, body: { name?: string; description?: string | null }) =>
    request<Category>(`/categories/${id}`, { method: 'PATCH', body }),
  deleteCategory: (id: number) => request<void>(`/categories/${id}`, { method: 'DELETE' }),

  listPlaces: (query: PlaceQuery = {}) => {
    const q = new URLSearchParams()
    if (query.city_id !== undefined) q.set('city_id', String(query.city_id))
    if (query.category_id !== undefined) q.set('category_id', String(query.category_id))
    if (query.is_favorite !== undefined) q.set('is_favorite', String(query.is_favorite))
    if (query.min_rating !== undefined) q.set('min_rating', String(query.min_rating))
    const qs = q.toString()
    return request<Place[]>(`/places${qs ? `?${qs}` : ''}`)
  },
  createPlace: (body: {
    city_id: number
    category_id: number
    name: string
    address: string
    description?: string | null
    latitude?: number | null
    longitude?: number | null
    price_level?: number
    is_favorite?: boolean
  }) => request<Place>('/places', { method: 'POST', body }),
  updatePlace: (
    id: number,
    body: {
      city_id?: number
      category_id?: number
      name?: string
      address?: string
      description?: string | null
      latitude?: number | null
      longitude?: number | null
      price_level?: number
      is_favorite?: boolean
    },
  ) => request<Place>(`/places/${id}`, { method: 'PATCH', body }),
  deletePlace: (id: number) => request<void>(`/places/${id}`, { method: 'DELETE' }),
  getPlaceStats: (id: number) => request<PlaceStats>(`/places/${id}/stats`),
  getPlaceVisits: (id: number) => request<Visit[]>(`/places/${id}/visits`),

  listVisits: () => request<Visit[]>('/visits'),
  createVisit: (body: { place_id: number; visited_at: string; rating: number; comment?: string | null }) =>
    request<Visit>('/visits', { method: 'POST', body }),
  updateVisit: (
    id: number,
    body: { place_id?: number; visited_at?: string; rating?: number; comment?: string | null },
  ) => request<Visit>(`/visits/${id}`, { method: 'PATCH', body }),
  deleteVisit: (id: number) => request<void>(`/visits/${id}`, { method: 'DELETE' }),

  listTripPlans: () => request<TripPlan[]>('/trip-plans'),
  createTripPlan: (body: {
    city_id: number
    name: string
    description?: string | null
    start_date?: string | null
    end_date?: string | null
  }) => request<TripPlan>('/trip-plans', { method: 'POST', body }),
  updateTripPlan: (
    id: number,
    body: {
      city_id?: number
      name?: string
      description?: string | null
      start_date?: string | null
      end_date?: string | null
    },
  ) => request<TripPlan>(`/trip-plans/${id}`, { method: 'PATCH', body }),
  deleteTripPlan: (id: number) => request<void>(`/trip-plans/${id}`, { method: 'DELETE' }),
  listTripPlanItems: (planId: number) => request<TripItem[]>(`/trip-plans/${planId}/items`),

  createTripItem: (body: {
    trip_plan_id: number
    place_id: number
    visit_date?: string | null
    start_time?: string | null
    end_time?: string | null
    notes?: string | null
  }) => request<TripItem>('/trip-items', { method: 'POST', body }),
  deleteTripItem: (id: number) => request<void>(`/trip-items/${id}`, { method: 'DELETE' }),
}