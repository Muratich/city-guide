from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_crud_and_business_logic() -> None:
    city_id = None
    other_city_id = None
    category_id = None
    try:
        category = client.post(
            "/api/categories",
            json={"name": "Museum", "description": "expo"},
        )
        assert category.status_code == 201
        category_id = category.json()["id"]

        city = client.post(
            "/api/cities",
            json={"name": "Moscow", "country": "RU", "description": "capital"},
        )
        assert city.status_code == 201
        city_id = city.json()["id"]

        place1 = client.post(
            "/api/places",
            json={
                "city_id": city_id,
                "category_id": category_id,
                "name": "Tretyakov",
                "address": "Lavrushinsky 10",
                "price_level": 2,
            },
        ).json()
        place2 = client.post(
            "/api/places",
            json={
                "city_id": city_id,
                "category_id": category_id,
                "name": "Gorky Park",
                "address": "Krymsky Val",
                "price_level": 1,
            },
        ).json()

        client.post(
            "/api/visits",
            json={"place_id": place1["id"], "visited_at": "2026-01-01T10:00:00Z", "rating": 5},
        )
        client.post(
            "/api/visits",
            json={"place_id": place1["id"], "visited_at": "2026-02-01T10:00:00Z", "rating": 3},
        )

        stats = client.get(f"/api/places/{place1['id']}/stats").json()
        assert stats["visit_count"] == 2
        assert stats["avg_rating"] == 4.0

        filtered = client.get(
            "/api/places",
            params={"city_id": city_id, "min_rating": 3.5},
        ).json()
        assert [p["id"] for p in filtered] == [place1["id"]]

        plan = client.post(
            "/api/trip-plans",
            json={
                "city_id": city_id,
                "name": "Weekend",
                "start_date": "2026-05-01",
                "end_date": "2026-05-03",
            },
        ).json()

        item1 = client.post(
            "/api/trip-items",
            json={"trip_plan_id": plan["id"], "place_id": place1["id"]},
        )
        assert item1.status_code == 201
        assert item1.json()["position"] == 0

        item2 = client.post(
            "/api/trip-items",
            json={"trip_plan_id": plan["id"], "place_id": place2["id"]},
        )
        assert item2.status_code == 201
        assert item2.json()["position"] == 1

        items = client.get(f"/api/trip-plans/{plan['id']}/items").json()
        assert [i["position"] for i in items] == [0, 1]

        other_city = client.post(
            "/api/cities",
            json={"name": "Saint Petersburg", "country": "RU"},
        ).json()
        other_city_id = other_city["id"]
        other_place = client.post(
            "/api/places",
            json={
                "city_id": other_city_id,
                "category_id": category_id,
                "name": "Hermitage",
                "address": "Palace Square 2",
                "price_level": 2,
            },
        ).json()

        bad_item = client.post(
            "/api/trip-items",
            json={"trip_plan_id": plan["id"], "place_id": other_place["id"]},
        )
        assert bad_item.status_code == 422

        upd = client.patch(f"/api/places/{place1['id']}", json={"is_favorite": True})
        assert upd.status_code == 200
        assert upd.json()["is_favorite"] is True

        favs = client.get("/api/places", params={"is_favorite": "true"}).json()
        assert place1["id"] in [p["id"] for p in favs]

        bad_rating = client.post(
            "/api/visits",
            json={"place_id": place1["id"], "visited_at": "2026-03-01T10:00:00Z", "rating": 9},
        )
        assert bad_rating.status_code == 422

        bad_dates = client.post(
            "/api/trip-plans",
            json={
                "city_id": city_id,
                "name": "Broken",
                "start_date": "2026-05-10",
                "end_date": "2026-05-01",
            },
        )
        assert bad_dates.status_code == 422
    finally:
        if city_id is not None:
            client.delete(f"/api/cities/{city_id}")
        if other_city_id is not None:
            client.delete(f"/api/cities/{other_city_id}")
        if category_id is not None:
            client.delete(f"/api/categories/{category_id}")