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

Весь проект запускается через Docker Compose и состоит из PostgreSQL, отдельного процесса миграций, API и frontend.

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

Проект состоит из четырёх основных сервисов.

|Сервис|Назначение|
|---|---|
|`postgres`|PostgreSQL 18, хранилище данных и healthcheck|
|`migrate`|Одноразовое применение миграций Alembic|
|`api`|FastAPI и Uvicorn|
|`frontend`|Сборка Vite и раздача статических файлов через Nginx|

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
|`VITE_API_URL`|Базовый URL API для frontend|`http://localhost:8000/api`|

---

# Быстрый запуск

## Docker Compose

Для запуска полного приложения используется Docker Compose.

```
docker compose up -d
```

После запуска доступны следующие сервисы:

|Компонент|Адрес|
|---|---|
|Web-интерфейс|`http://localhost:5173`|
|Swagger / OpenAPI|`http://localhost:8000/docs`|
|Healthcheck API|`http://localhost:8000/health`|

Состояние контейнеров можно проверить через `docker compose ps`.

Логи API доступны через `docker compose logs -f api`.

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

Манифесты в `k8s/` разворачивают приложение в namespace `cityguide`: PostgreSQL с PVC, API, frontend и Ingress. Миграция запускается init-контейнером API до старта сервера. Образы `city-backend:latest` и `city-frontend:latest` должны быть собраны и доступны именно в используемом Minikube-кластере. Команда сборки ниже делает это напрямую и не требует отдельного `docker push`.

## Запуск приложения

Установите Minikube и `kubectl`. Соберите образы и загрузите их в Minikube:

```powershell
minikube start
minikube addons enable ingress
docker build -t city-backend:latest ./backend
docker build -t city-frontend:latest --build-arg VITE_API_URL=/api ./frontend
minikube image load city-backend:latest city-frontend:latest
```

Примените ресурсы в указанном порядке:

```powershell
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml -f k8s/secret.yaml -f k8s/pvc.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/api.yaml -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/victoria-logs.yaml
kubectl -n cityguide rollout status deployment/postgres
kubectl -n cityguide rollout status deployment/api
kubectl -n cityguide rollout status deployment/frontend
kubectl -n cityguide rollout status deployment/victoria-logs
kubectl -n cityguide rollout status daemonset/vlagent
```

Откройте адрес ingress:

```powershell
minikube ip
```

Ingress controller должен быть включён в Minikube, чтобы пользоваться Ingress-адресом. Для простого локального запуска пробросьте frontend: `kubectl -n cityguide port-forward svc/frontend 8080:80`; страница откроется на `http://localhost:8080`. Nginx frontend пересылает `/api/` внутреннему Service API. В Minikube на Hyper-V команды управления Minikube могут требовать PowerShell от имени администратора.

После изменения исходников или build args соберите образы заново. `imagePullPolicy: IfNotPresent` намеренно позволяет Minikube использовать собранные локально образы. При зависшем запуске смотрите `kubectl -n cityguide get pods`, `kubectl -n cityguide describe pod <имя-пода>` и `kubectl -n cityguide logs <имя-пода> --all-containers`.

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
