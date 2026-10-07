# LogsQL для City Guide

VictoriaLogs сохраняет `timestamp` как системное время `_time`, а `message` — как `_msg`. Остальные JSON-поля доступны для фильтрации после разбора JSON. Сборщик VictoriaLogs Collector передаёт stdout/stderr контейнеров Kubernetes.

Откройте `http://localhost:9428/select/vmui/` после запуска port-forward и вставьте запрос в LogsQL.

## Запросы

1. **Сырые записи за последние 15 минут**

   ```logsql
   _time:15m
   ```

2. **Ошибки API**

   ```logsql
   _time:1h service.name:"city-guide-api" level:error
   ```

3. **Число записей по уровню**

   ```logsql
   _time:1h service.name:"city-guide-api" | stats by (level) count() logs
   ```

4. **Топ-5 наиболее часто встречающихся сообщений**

   ```logsql
   _time:1h service.name:"city-guide-api" | top 5 by (_msg)
   ```

В приложении нет полей длительности запроса, поэтому для агрегации выбран `top`, а не квантиль времени ответа. Запросы подготовлены для запуска в vmui; их фактический результат появится после развёртывания кластера и поступления логов.
