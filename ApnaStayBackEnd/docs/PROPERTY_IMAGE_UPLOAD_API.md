# Property images stored in DB (multipart API)

## Constraints (enforced server-side)

| Rule | Value |
|------|--------|
| Max files per property | 20 |
| Max size per file | 7 MB |
| Allowed types | JPEG, PNG, WebP, GIF |
| Validation | `Content-Type` must match **magic bytes** (`application/octet-stream` allowed if bytes match an allowed image) |

## Create property with uploads

**`POST /api/property`**  
**Headers:** `Authorization: Bearer <jwt>`, CSRF header if enabled  
**`Content-Type`:** `multipart/form-data`

| Part | Content-Type | Required | Description |
|------|----------------|----------|-------------|
| `property` | `application/json` | Yes | Same JSON shape as `PropertyRequest` (title, description, …, `images` = list of **external** URL strings only). Do not put base64 blobs here. |
| `imageFiles` | file stream | No | Repeat this part name for each file (or omit entirely). |

**Response:** Same as JSON create — `ApiResponse<PropertyDTO>` with `data.images` containing **merged** external URLs **plus** absolute URLs to `GET /api/property/image-file/{id}` (see `app.public-base-url`).

## Update property with uploads

**`PUT /api/property/{propertyId}`**  
**`Content-Type`:** `multipart/form-data`  
Parts: same as create.

**Semantics for `imageFiles`:**

- **Part omitted:** existing DB-stored images are **unchanged** (use JSON-only `PUT` with `application/json` for the same).
- **Part present with files:** **replaces** all previously stored BLOB images with the new set.
- **Part present with zero files:** implementation-dependent — send only JSON update to avoid clearing; to clear blobs only, a future flag may be added.

External URL list in `property.images` still updates the `property_images` element collection when you send JSON or the JSON part of multipart.

## Serve stored image bytes

**`GET /api/property/image-file/{imageFileId}`** — **permitted without auth** for routing; access control in service:

- Allowed if property status is **AVAILABLE** (public listing).
- Otherwise allowed for **owner** or **ADMIN** (JWT optional; send `Authorization` when viewing draft listings).

**Response:** raw bytes, `Content-Type` from stored value, `Cache-Control: public, max-age=86400`.

## Configuration

- **`spring.servlet.multipart.max-file-size`** / **`max-request-size`** — see `application-dev.properties` / `application-prod.properties`.
- **`app.public-base-url`** — base URL prepended to `/api/property/image-file/{id}` in JSON responses (e.g. `https://api.example.com`). If empty, API returns path-only URLs; clients must prefix with their API host.
