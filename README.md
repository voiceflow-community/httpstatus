# httpstatus Node.js service

A minimalist Node.js web service for simulating HTTP responses, inspired by [httpstat.us](https://httpstat.us).
Useful for testing client-side error handling, API integrations and timeouts in Voiceflow agents.

---

## Features
- **Status Code Simulation:** Return any HTTP status code via URL (e.g., `/404`).
- **Custom Response Body:** Specify a custom response body via query or POST body.
- **Random Code Generation:** `/random/{range}` endpoint for randomized responses.
- **Delayed Responses:** Add delay via `?sleep=ms` query parameter.
- **Redirects:** `/redirect/:code?to=url` for HTTP redirects.
- **Echo Endpoint:** `/echo` returns request details for debugging.
- **Health Check:** `/health` always returns 200 OK.
- **Rate Limiting:** Configurable per-IP rate limiting.
- **OpenAPI Docs:** Interactive API docs at `/docs`.
- **Status Code Descriptions:** JSON responses include details and MDN links.
- **JSON by Default:** `/[code]` and `/random/{range}` endpoints always return JSON unless a custom response body is provided.
- **Timing Info:** JSON responses include `startTime`, `replyTime`, `duration_in_ms`, and `duration_in_seconds`.

---

## Getting Started

### 1. Clone & Install
```sh
git clone <repo-url>
cd httpstatus
npm install
```

### 2. Configure Environment
Create a `.env` file in the project root:
```
PORT=3000
RATE_LIMIT_WINDOW_MINUTES=15  # (optional) Window in minutes for rate limiting
RATE_LIMIT_MAX=100            # (optional) Max requests per window per IP
```
Change the port and rate limit values as needed.

### 3. Run the Server
```sh
node index.js
```

---

## Docker

### Build and Run with Docker
```sh
docker build -t httpstatus .
docker run --env-file .env -p 3000:3000 httpstatus
```

### Using Docker Compose
```sh
docker-compose up --build
```
- The service will use the `PORT` specified in your `.env` file (default: 3000).
- Access the service at `http://localhost:<PORT>`

---

## Usage

### Status Code Endpoint
- `GET /404` — Returns HTTP 404 Not Found as JSON
- `GET /200?sleep=1000` — Returns 200 OK as JSON after 1 second
- `GET /500?body={"error":"fail"}` — Returns custom JSON body
- `POST /201` with JSON body — Returns custom body with 201 status

### Random Status Code
- `GET /random/200,201,500-504` — Returns a random code from the list/range as JSON

> **Note:** By default, `/[code]` and `/random/{range}` endpoints always return JSON unless a custom response body is provided (via `?body=` or POST body).

#### Example JSON Response
```json
{
  "code": 200,
  "requestedCode": "200",
  "description": "OK",
  "definition": "OK: The request has succeeded.",
  "details": "OK: The request has succeeded.",
  "mdn": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/200",
  "startTime": "2025-06-27T12:00:00.000Z",
  "replyTime": "2025-06-27T12:00:01.005Z",
  "duration_in_ms": 1005,
  "duration_in_seconds": 1.005
}
```

### Redirect
- `GET /redirect/302?to=https://example.com` — Redirects with 302 status

### Echo
- `GET /echo` — Returns request info
- `POST /echo` with body — Returns request info including body

### Health
- `GET /health` — Always returns 200 OK

### Docs
- `GET /docs` — OpenAPI/Swagger UI
- `GET /openapi.json` — Raw OpenAPI spec (JSON)
- `GET /openapi.yaml` — Raw OpenAPI spec (YAML)

---

## Endpoints

| Endpoint                | Description                                              |
|------------------------|----------------------------------------------------------|
| `/[code]`              | Returns the specified HTTP status code (JSON by default) |
| `/random/{range}`      | Returns a random status code from a list or range (JSON) |
| `/redirect/{code}`     | Redirects to a URL with the specified status code        |
| `/echo`                | Returns request details                                  |
| `/health`              | Health check (always 200 OK)                             |
| `/docs`                | OpenAPI/Swagger documentation                            |
| `/openapi.json`        | Raw OpenAPI spec (JSON)                                  |
| `/openapi.yaml`        | Raw OpenAPI spec (YAML)                                  |

---

## Rate Limiting
- Each IP is limited to a configurable number of requests per window (default: 100 requests per 15 minutes).
- Configure via `.env`:
  - `RATE_LIMIT_WINDOW_MINUTES` — Window size in minutes (default: 15)
  - `RATE_LIMIT_MAX` — Max requests per window per IP (default: 100)
- Standard `RateLimit-*` headers are included in responses.

---

## OpenAPI Documentation
- Interactive docs available at [`/docs`](http://localhost:3000/docs) (port may vary).
- Raw OpenAPI spec available at [`/openapi.json`](http://localhost:3000/openapi.json) and [`/openapi.yaml`](http://localhost:3000/openapi.yaml).
- The docs always reflect the current server port.

---

## License
MIT


[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=voiceflow-community_httpstatus&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=voiceflow-community_httpstatus)
