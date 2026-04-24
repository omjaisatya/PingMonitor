# API Reference

## Quick Summarize - HTTP Status Code

### Success (2xx)

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE with no response body |

### Client Errors (4xx)

| Code | Meaning | When Used |
|------|---------|-----------|
| 400 | Bad Request | Invalid input, validation failed |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | User doesn't have permission |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry (email already exists) |
| 422 | Unprocessable Entity | Validation error in request body |

### Server Errors (5xx)

| Code | Meaning | When Used |
|------|---------|-----------|
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | Database connection failed |
| 503 | Service Unavailable | Server maintenance, overloaded |

## Authentication - Endpoint

All endpoints (except login/register) require a Bearer token in the Authorization header:

```txt
Authorization: Bearer <token>
```

> Base Url: `http://localhost:5000/`

### Register

- **Method:** POST
- **Endpoint:** `/api/auth/signup`
- **Body:**

  ```json
    {
        "name": "Api Test",
        "email": "test@test.com",
        "password": "test123456"
    }
  ```

- **Response:** 201 Created

```json
  {
    "message": "Successfully created account",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZWIxMDEyMTY2ZTMyYmQ1MmI1NTExNiIsImlhdCI6MTc3NzAxMjc1NCwiZXhwIjoxNzc3NDQ0NzU0fQ.Pn0q9eKTkKHQDo9rrlQ094s52lrGlJCo3upsvHdyrCE",
    "newUser": {
        "id": "69eb1012166e32bd52b55116",
        "name": "Api Test",
        "email": "test@test.com"
    }
  }
```

- **Error Codes:** 400, 409

### Login

- **Endpoint:** POST `/api/auth/login`
- **Body:**

```json
  {
    "email": "test@test.com",
    "password": "test123456"
  }
```

- **Response:** 200 OK

```json
  {
    "message": "Successfully login",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZWIxMDEyMTY2ZTMyYmQ1MmI1NTExNiIsImlhdCI6MTc3NzAxMzU4MywiZXhwIjoxNzc3NDQ1NTgzfQ.ntKTLOvDeezyW36gtg47lKSeTb6U6BX9qdOeKPxmmuA",
    "user": {
        "id": "69eb1012166e32bd52b55116",
        "email": "test@test.com",
        "password": "$2b$12$c04ai23fFeVDqXI91DBlUufYObyHx/meqoYamt.YBDisXz7RwMjuG"
    }
  }
```

## Monitor - Endpoints

> Note: Include the token in the authorization header
> Auth: Yes

### Create a new monitor

- **Method:** POST
- **Endpoint:** `/api/monitors`
- **Body**

```json
    {
        "name": "Google",
        "url": "https://google.com",
        "interval": 10
    }
```

- **Response:** 201 Created

```json
    {
    "message": "Monitor created",
        "monitor": {
            "userId": "69eb1012166e32bd52b55116",
            "name": "Google",
            "url": "https://google.com",
            "status": "unknown", //default
            "interval": 10,
            "isActive": true,
            "timezone": "UTC",
            "_id": "69eb1733166e32bd52b55197",
            "createdAt": "2026-04-24T07:09:39.144Z",
            "updatedAt": "2026-04-24T07:09:39.144Z",
            "__v": 0
        }
    }
```

### List all monitors for the authenticated user

- **Method:** GET
- **Endpoint:** `/api/monitors`

- **Response:** 200 OK

```json
{
    "count": 1,
    "allMonitors": [
        {
            "_id": "69eb1733166e32bd52b55197",
            "userId": "69eb1012166e32bd52b55116",
            "name": "Google",
            "url": "https://google.com",
            "status": "down",
            "interval": 10,
            "isActive": true,
            "timezone": "UTC",
            "createdAt": "2026-04-24T07:09:39.144Z",
            "updatedAt": "2026-04-24T07:15:01.042Z",
            "__v": 0
        }
    ]
}
```

### Update monitor configuration

- **Method:** PUT
- **Endpoint:** `/api/monitors/:id`
- **Body**

```json
{
    "name": "Google",
    "url" : "https://www.google.com",
    "interval" : 5
}
```

- **Response:** 200 OK

```json
{
    "message": "Successfully Updated",
    "monitor": {
        "_id": "69eb1733166e32bd52b55197",
        "userId": "69eb1012166e32bd52b55116",
        "name": "Google",
        "url": "https://www.google.com",
        "status": "down",
        "interval": 5,
        "isActive": true,
        "timezone": "UTC",
        "createdAt": "2026-04-24T07:09:39.144Z",
        "updatedAt": "2026-04-24T07:26:42.712Z",
        "__v": 0
    }
}
```

### Get a single monitor by ID

- **Method:** GET
- **Endpoint:** `/api/monitors/:id`

- **Response:** 200 OK

```json

{
    "monitor": {
        "_id": "69eb1733166e32bd52b55197",
        "userId": "69eb1012166e32bd52b55116",
        "name": "Google",
        "url": "https://www.google.com",
        "status": "up",
        "interval": 5,
        "isActive": true,
        "timezone": "UTC",
        "createdAt": "2026-04-24T07:09:39.144Z",
        "updatedAt": "2026-04-24T07:30:00.980Z",
        "__v": 0
    },
    "logs": [
        {
            "_id": "69eb1b44166e32bd52b5521d",
            "monitorId": "69eb1733166e32bd52b55197",
            "status": "up",
            "statusCode": 200,
            "responseTime": 838,
            "timestamp": "2026-04-24T07:27:00.878Z",
            "createdAt": "2026-04-24T07:27:00.878Z",
            "__v": 0
        },
        {
            "_id": "69eb1875166e32bd52b551c1",
            "monitorId": "69eb1733166e32bd52b55197",
            "status": "down",
            "statusCode": null,
            "responseTime": 1010,
            "timestamp": "2026-04-24T07:15:01.039Z",
            "createdAt": "2026-04-24T07:15:01.040Z",
            "__v": 0
        },
    ]
}
```

### Toggle monitor on/off status

- **Method:** PATCH
- **Endpoint:** `/api/monitors/:id/toggle`

- **Response:** 200 OK

```json
{
    "message": "Successfully update monitor toggle",
    "monitor": {
        "_id": "69eb1733166e32bd52b55197",
        "userId": "69eb1012166e32bd52b55116",
        "name": "Google",
        "url": "https://www.google.com",
        "status": "unknown",
        "interval": 5,
        "isActive": false,
        "timezone": "UTC",
        "createdAt": "2026-04-24T07:09:39.144Z",
        "updatedAt": "2026-04-24T07:39:39.194Z",
        "__v": 0
    }
}
```

### Delete a monitor and all its logs

- **Method:** DELETE
- **Endpoint:** `/api/monitors/:id`

- **Response:** 200 OK

```json
{
    "message": "Monitor and its logs deleted"
}
```
