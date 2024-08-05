# Broadcast API

Broadcast emails to newsletter members or event attendees.

## Local developement

Local developement requires a few env variables:

- `API_KEY` - Arbitrary string value, that needs to match `Authorization` bearer
- `API_KEY_NEWSLETTER` - Arbitrary string value, that needs to match `Authorization` bearer of newsletter API call
- `API_KEY_TICKETS` - Arbitrary string value, that needs to match `Authorization` bearer of tickets API call
- `API_KEY_RESEND` - Ask Pawel, we will be happy to give it to contributors

```
API_KEY=XXX API_KEY_TICKETS=XXX API_KEY_NEWSLETTER=XXX API_KEY_RESEND=XXX deno run --allow-env --allow-net index.ts
```

## Endpoints

### POST /

```
curl --request POST \
  --url http://localhost:8000/ \
  --header 'Authorization: Bearer XXX' \
  --header 'Content-Type: application/json' \
  --data '{
  "template": "template_name",
  "audience": "newsletter"
}'
```

```
curl --request POST \
  --url http://localhost:8000/ \
  --header 'Authorization: Bearer XXX' \
  --header 'Content-Type: application/json' \
  --data '{
  "template": "template_name",
  "audience": "event",
  "eventId": 1,
}'
```
