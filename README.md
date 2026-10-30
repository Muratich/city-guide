# City Guide

Клиент-серверное приложение для организации информации о городах, достопримечательностях, посещениях и планах поездок.

## Технологический стек

### Backend

- Python 3.14

- FastAPI

- SQLAlchemy 2

- PostgreSQL 18

- Alembic

- uv


### Frontend

- React 19

- TypeScript в строгом режиме

- Vite

- стандартный `fetch` для HTTP-запросов

- собственные CSS-стили без UI-библиотек


### Инфраструктура

Весь проект запускается через Docker Compose: PostgreSQL, миграции, API, frontend, пробер, PostgreSQL exporter, VictoriaMetrics и vmagent.

---

# Доменная модель

Приложение содержит шесть основных сущностей.

|Сущность|Описание|
|---|---|
|**Город (`cities`)**|Название, страна и описание города. Пара `name + country` должна быть уникальной.|
|**Категория (`categories`)**|Категория достопримечательности, например «Музеи». Название категории уникально.|
|**Место (`places`)**|Достопримечательность, относящаяся к определённому городу и категории. Хранит адрес, координаты, ценовой уровень и признак избранного места. Пара `city + name` уникальна.|
|**Визит (`visits`)**|Информация о посещении места: дата и время, оценка и комментарий.|
|**План поездки (`trip_plans`)**|План поездки по конкретному городу с датами начала и окончания.|
|**Пункт плана (`trip_items`)**|Конкретное место, включённое в план поездки, с датой и временем, заметками и порядковым номером.|

## Бизнес-правила

Основные ограничения проверяются на уровне API, Pydantic-схем и базы данных.

- Связь места с городом и категорией обеспечивается внешними ключами.

- Пункт плана может содержать только место, относящееся к тому же городу, что и сам план поездки. Проверка выполняется на backend.

- Порядковый номер (`position`) пункта плана назначается сервером автоматически.

- `position` должен быть уникальным в пределах одного плана. При конфликте возвращается `409 Conflict`.

- Оценка посещения ограничена диапазоном от 1 до 5.

- Ценовой уровень места ограничен диапазоном от 1 до 4.

- Для координат установлены допустимые географические диапазоны.

- Даты начала и окончания плана проверяются на корректность: начало не должно быть позже окончания.


---

# Структура проекта

```text
city-guide/
├── backend/
│   ├── alembic/
│   ├── alembic.ini
│   ├── app/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── api/
│   ├── tests/
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── Dockerfile
│   └── docker-entrypoint.sh
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── api.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── ui.tsx
│   │   ├── format.ts
│   │   └── index.css
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
└── .env.example
```

## Backend

### `app/core/config.py`

Содержит настройки приложения, загружаемые из переменных окружения с использованием `pydantic-settings`.

### `app/db/`

Содержит подключение к PostgreSQL, SQLAlchemy `engine`, фабрику сессий и декларативный `Base`.

### `app/models/`

Содержит ORM-модели шести сущностей домена.

### `app/schemas/`

Содержит Pydantic-схемы для входных и выходных данных API.

### `app/services/`

Содержит бизнес-логику, которая не должна находиться непосредственно в HTTP-роутах. В частности, здесь реализована проверка принадлежности пункта плана тому же городу, что и план.

### `app/api/routes/`

Содержит HTTP-роутеры FastAPI для работы с основными ресурсами приложения.

## Frontend

### `src/api.ts`

Центральный HTTP-клиент frontend. Содержит TypeScript-типы данных и функции обращения к API через `fetch`.

### `src/pages/`

Содержит страницы для городов, категорий, мест, посещений и планов поездок.

### `src/App.tsx`

Отвечает за основную структуру приложения и переключение разделов через состояние React. Дополнительный роутер не используется.

### `src/ui.tsx`

Содержит переиспользуемые элементы интерфейса: поля форм, сообщения об ошибках и пустые состояния.

### `src/format.ts`

Содержит функции форматирования дат, времени и ценового уровня.

### `src/index.css`

Единый файл CSS для оформления всего frontend-приложения.

---

# Docker Compose

Compose поднимает приложение, базу, экспортёр базы и мониторинг.

|Сервис|Назначение|
|---|---|
|`postgres`|PostgreSQL 18, хранилище данных и healthcheck|
|`migrate`|Одноразовое применение миграций Alembic|
|`api`|FastAPI и Uvicorn|
|`frontend`|Сборка Vite и раздача статических файлов через Nginx|
|`api-prober`|Проверка API и экспорт синтетических метрик|
|`postgres-exporter`|Метрики PostgreSQL|
|`victoriametrics`|Хранение метрик|
|`vmagent`|Сбор и отправка метрик в VictoriaMetrics|

Сервис `migrate` выполняет `alembic upgrade head` и завершается после успешного выполнения. Завершение с кодом `0` является штатным состоянием. Сервис `api` запускается только после успешного завершения `migrate`.

---

# Переменные окружения

Основные настройки приложения передаются через переменные окружения.

|Переменная|Назначение|Значение по умолчанию|
|---|---|---|
|`POSTGRES_DB`|Имя базы данных|`city_guide`|
|`POSTGRES_USER`|Пользователь PostgreSQL|`city_guide`|
|`POSTGRES_PASSWORD`|Пароль PostgreSQL|`city_guide`|
|`DATABASE_URL`|URL подключения backend и Alembic|PostgreSQL URL из Compose|
|`CORS_ORIGINS`|Разрешённые frontend origin|локальные адреса на порту 5173|
|`VITE_API_URL`|Базовый URL API для frontend|`/api` через Nginx proxy|

---

# Быстрый запуск

## Docker Compose

Для запуска приложения и мониторинга используется Docker Compose.

```
docker compose up -d --build
```

После запуска доступны следующие сервисы:

|Компонент|Адрес|
|---|---|
|Web-интерфейс|`http://localhost:5173`|
|Swagger / OpenAPI|`http://localhost:8000/docs`|
|Healthcheck API|`http://localhost:8000/health`|
|Пробер|`http://localhost:8001/metrics`|
|PostgreSQL exporter|`http://localhost:9187/metrics`|
|VictoriaMetrics UI|`http://localhost:8428/vmui/`|
|vmagent targets|`http://localhost:8429/targets`|

Состояние контейнеров можно проверить через `docker compose ps`.

Логи API доступны через `docker compose logs -f api`.

Остановить Compose-сервисы, сохранив данные PostgreSQL и VictoriaMetrics в volumes, можно командой `docker compose down`.

---

# Тестирование

Тесты backend запускаются через `pytest`.

Основной интеграционный тест использует `TestClient` FastAPI и проверяет работу API целиком.

Проверяются:

- CRUD-операции;

- статистика мест;

- фильтрация;

- работа с посещениями;

- работа с планами поездок и пунктами плана;

- бизнес-правило принадлежности места к городу плана;

- валидация входных данных и ошибки `422`.


Перед тестами `tests/conftest.py` применяет миграции базы данных.

Тестовый сценарий использует фиксированные значения и уникальные ограничения, поэтому база данных перед запуском тестов должна находиться в чистом состоянии.

---

# Kubernetes / Minikube

Манифесты в `k8s/` разворачивают приложение в namespace `cityguide`: PostgreSQL с PVC, API, frontend и Ingress. Миграция запускается init-контейнером API до старта сервера. Имена образов при сборке должны совпадать с манифестами: `city-backend:lf` и `city-frontend:api-proxy`.

## Запуск приложения

Установите Minikube, `kubectl` и Helm. Скрипт соберёт образы прямо в Minikube, применит манифесты приложения, пробера, VictoriaLogs и VictoriaMetrics, дождётся готовности и поднимет port-forward’ы в фоне:

```powershell
.\scripts\start-minikube.ps1
```

Скрипт открывает следующие адреса:

- `http://localhost:8080` — frontend;
- `http://localhost:8000/docs` — API;
- `http://localhost:8001/metrics` — метрики пробера;
- `http://localhost:9187/metrics` — метрики PostgreSQL;
- `http://localhost:8428/vmui/` — VictoriaMetrics;
- `http://localhost:8429/targets` — vmagent;
- `http://localhost:9428/select/vmui/` — VictoriaLogs.

Для остановки только запущенных скриптом port-forward’ов используйте `.\scripts\stop-port-forwards.ps1`. Сам кластер Minikube при этом остаётся запущенным. Nginx frontend пересылает `/api/` внутреннему Service API.

После изменения исходников соберите образ заново и загрузите его в Minikube. Если тег образа не менялся, перезапустите Deployment, чтобы Pod использовал обновлённый локальный образ:

```powershell
kubectl -n cityguide rollout restart deployment/api
```

`imagePullPolicy: IfNotPresent` позволяет использовать образы из Minikube. При зависшем запуске смотрите `kubectl -n cityguide get pods`, `kubectl -n cityguide describe pod <имя-пода>` и `kubectl -n cityguide logs <имя-пода> --all-containers`.

## VictoriaLogs и доставка логов

VictoriaLogs и официальный агент `vlagent` разворачиваются манифестом [k8s/victoria-logs.yaml](k8s/victoria-logs.yaml). Манифест создаёт VictoriaLogs Single-node с PVC 2 GiB и сроком хранения 7 дней, Service для доступа внутри кластера, а также DaemonSet сборщика с минимальными правами Kubernetes API. Сборщик читает логи узла и отправляет их в `http://victoria-logs:9428/insert/native`.

```powershell
kubectl apply -f k8s/victoria-logs.yaml
kubectl -n cityguide rollout status deployment/victoria-logs
kubectl -n cityguide rollout status daemonset/vlagent
kubectl -n cityguide port-forward svc/victoria-logs 9428:9428
```

Откройте `http://localhost:9428/select/vmui/`. Примеры четырёх LogsQL-запросов и пояснение к полям находятся в [logs-queries.md](logs-queries.md). Приложение пишет структурированные JSON-строки в stdout; collector собирает логи контейнеров на узлах. Чтобы видеть записи, сначала запустите приложение и дождитесь появления запросов к API.

Проверка состояния:

```powershell
kubectl -n cityguide get pods,pvc,svc
```

Для обновления повторно примените манифест командой `kubectl apply -f k8s/victoria-logs.yaml`. PVC VictoriaLogs удаляйте отдельно только если сохранённые логи больше не нужны.

## VictoriaMetrics и метрики приложения

API отдаёт по `/metrics` данные в формате OpenMetrics 1.0: Instrumentator считает HTTP-запросы, отдельные SLI-метрики API считают успешные/неуспешные запросы и их длительность, а стандартные collectors `prometheus-client` добавляют метрики Python-процесса. Запросы `/health` и `/metrics` исключены из HTTP-счётчиков. Четыре бизнес-счётчика увеличиваются после успешного сохранения города, места, посещения или плана поездки; они показывают активность, но не используются для оценки доступности, так как не считают неуспешные попытки. PostgreSQL exporter работает в том же Pod, что и база, и отдаёт её метрики на порту `9187`.

VictoriaMetrics Single устанавливается Helm chart’ом, а `vmagent` обнаруживает Pod’ы namespace `cityguide` и скрейпит только те, у которых есть аннотация `prometheus.io/scrape: "true"`. Настройки VictoriaMetrics находятся в [k8s/victoria-metrics-values.yaml](k8s/victoria-metrics-values.yaml), манифест агента и service discovery — в [k8s/vmagent.yaml](k8s/vmagent.yaml).

`scripts/start-minikube.ps1` устанавливает VictoriaMetrics и vmagent автоматически. Если настраиваете мониторинг вручную, из корня репозитория выполните:

```powershell
helm repo add vm https://victoriametrics.github.io/helm-charts/
helm repo update
helm upgrade --install vm-single vm/victoria-metrics-single `
  --namespace monitoring `
  --create-namespace `
  --values .\k8s\victoria-metrics-values.yaml
kubectl apply -f .\k8s\vmagent.yaml
kubectl rollout restart deployment/vmagent -n monitoring
kubectl rollout status statefulset/vm-single-victoria-metrics-single-server -n monitoring
kubectl rollout status deployment/vmagent -n monitoring
```

Команды устанавливают VictoriaMetrics в namespace `monitoring` и применяют `vmagent`. Метрики API, пробера и PostgreSQL собираются автоматически по scrape-аннотациям Pod’ов. При ручной установке разверните пробер отдельно:

```powershell
kubectl apply -f .\k8s\prober.yaml
kubectl rollout status deployment/api-prober -n cityguide
```

Формулы SLI/SLO/SLA и готовые PromQL-запросы приведены в [Отчёт.md](Отчёт.md).

Проверьте компоненты и обнаруженные цели:

```powershell
kubectl get pods -n monitoring
kubectl get svc -n monitoring
kubectl port-forward -n monitoring svc/vmagent 8429:8429
```

Откройте `http://localhost:8429/targets` и проверьте, что API и PostgreSQL exporter имеют статус `UP`. Это подтверждает доступность endpoint’ов; для проверки подключения экспортера к базе запросите `pg_up` в VictoriaMetrics. В отдельном окне пробросьте VictoriaMetrics и запросите метрики:

```powershell
kubectl port-forward -n monitoring svc/vm-single-victoria-metrics-single-server 8428:8428
curl.exe "http://localhost:8428/api/v1/label/__name__/values"
curl.exe "http://localhost:8428/api/v1/query?query=up"
curl.exe "http://localhost:8428/api/v1/query?query=cityguide_cities_created_total"
curl.exe "http://localhost:8428/api/v1/query?query=pg_up"
```

Подробное описание стека и четырёх бизнес-метрик приведено в [Отчёт.md](Отчёт.md). Скринкаст проверки можно записать после запуска Minikube и успешного сбора метрик.

## Оценка манифестов и 12 факторов

Манифесты покрывают базовый учебный запуск, но пока не являются production-ready. Они задают Deployment/Service, Ingress, PostgreSQL PVC, probes, ConfigMap/Secret и init-контейнер миграций. Секрет содержит учебный пароль и хранится в YAML в репозитории; для реального окружения нужны внешнее управление секретами и непредсказуемые учётные данные. Не заданы requests/limits, политики безопасности, TLS, резервное копирование БД, мониторинг и масштабирование. Нет Kubernetes overlays/Helm chart для самого приложения; параметры окружения и образы в основном заданы напрямую.

| 12-factor | Оценка |
|---|---|
| 1. Codebase | Один репозиторий; для одного приложения приемлемо. |
| 2. Dependencies | Backend зафиксирован `uv.lock`, frontend — `package-lock.json`; контейнеры изолируют runtime. |
| 3. Config | Конфигурация в env-переменных; исключение — учебный секрет в Kubernetes YAML. |
| 4. Backing services | PostgreSQL подключается через `DATABASE_URL`, но Compose и Kubernetes используют разные конфигурации и PVC управляется отдельно. |
| 5. Build, release, run | Docker-образы и манифесты разделены; сборка/поставка пока ручные, теги `latest` не обеспечивают повторяемость релиза. |
| 6. Processes | API stateless, состояние хранится в PostgreSQL; однорепличный Postgres требует бэкапов. |
| 7. Port binding | FastAPI слушает 8000, Nginx — 80; Kubernetes открывает их через Services/Ingress. |
| 8. Concurrency | API можно реплицировать; миграции выполняются при старте каждой новой реплики, что требует осторожности при одновременном rollout. |
| 9. Disposability | Контейнеры запускаются просто, но startup зависит от успешного подключения к БД и миграции. |
| 10. Dev/prod parity | Compose и Minikube используют близкие сервисы, однако способы ingress, адрес frontend API и секреты различаются. |
| 11. Logs | JSON логи API идут в stdout; сбор и хранение настроены отдельным VictoriaLogs Collector. |
| 12. Admin processes | Alembic migration есть; других одноразовых административных задач пока нет. |

Для учебного проекта основа хорошая; наиболее важные улучшения для развёртывания — фиксированные версии образов, вынесение секретов, requests/limits и автоматическая проверка манифестов в CI. Ingress не переписывает `/api`, что корректно: маршруты FastAPI тоже начинаются с `/api`. Ошибка была в абсолютном URL API у frontend для Kubernetes, теперь путь берётся относительно адреса страницы.

---

# API

Базовый путь API:

`/api`

Документация OpenAPI:

`http://localhost:8000/docs`

## Ресурсы

### `/api/cities`

Работа с городами:

- получение списка;

- создание;

- получение по идентификатору;

- изменение;

- удаление.


### `/api/categories`

Работа с категориями:

- получение списка;

- создание;

- получение по идентификатору;

- изменение;

- удаление.


### `/api/places`

Работа с местами:

- получение списка;

- создание;

- получение по идентификатору;

- изменение;

- удаление;

- фильтрация по городу;

- фильтрация по категории;

- фильтрация по избранному;

- фильтрация по минимальному рейтингу;

- получение статистики;

- получение истории посещений.


### `/api/visits`

Работа с посещениями:

- получение списка;

- создание;

- получение по идентификатору;

- изменение;

- удаление.


Список посещений сортируется по дате в порядке убывания.

### `/api/trip-plans`

Работа с планами поездок:

- получение списка;

- создание;

- получение по идентификатору;

- изменение;

- удаление;

- получение пунктов конкретного плана.


### `/api/trip-items`

Работа с пунктами плана:

- создание;

- получение;

- изменение;

- удаление.


При создании выполняется проверка города и автоматически определяется `position`.

## HTTP-коды ошибок

- `404 Not Found` — ресурс не найден;

- `422 Unprocessable Entity` — данные не прошли валидацию;

- `409 Conflict` — конфликт уникальности или `position` пункта плана.
