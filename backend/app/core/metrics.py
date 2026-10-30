from prometheus_client import Counter, Histogram


cities_created = Counter(
    "cityguide_cities_created",
    "Number of cities successfully created.",
)
places_created = Counter(
    "cityguide_places_created",
    "Number of places successfully created.",
)
visits_created = Counter(
    "cityguide_visits_created",
    "Number of visits successfully created.",
)
trip_plans_created = Counter(
    "cityguide_trip_plans_created",
    "Number of trip plans successfully created.",
)

# SLI-specific API metrics. Route templates keep label cardinality bounded.
api_requests = Counter(
    "cityguide_api_requests_total",
    "API requests grouped by route, method, and service outcome.",
    ("route", "method", "outcome"),
)
api_request_duration = Histogram(
    "cityguide_api_request_duration_seconds",
    "Duration of API requests in seconds.",
    ("route", "method"),
    buckets=(0.05, 0.1, 0.25, 0.5, 1, 2, 5),
)
