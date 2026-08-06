---
title: API Call Tasks
description: Use direct API calls for simple HTTP-style workflow steps.
---

API call tasks represent direct service calls in a workflow. Use them when a step can be expressed as a request without model reasoning or custom JavaScript.

```yaml
tasks:
  - id: fetch-status
    kind:
      apiCall:
        url: "https://api.example.com/items"
        method: "GET"
        headers:
          Accept: "application/json"
          X-Client-Version: "1"
    output_schema:
      type: object
      required: [status, headers, body]
      properties:
        status:
          type: integer
        headers:
          type: object
          additionalProperties:
            type: string
        body:
          type: object
    required_credentials: []
```

## When to use API call tasks

Use an API call task when:

- the request shape is simple
- the result can flow directly into downstream data bindings
- the workflow does not need SDK-specific behavior
- a Function task would only wrap one straightforward request

Use a Function task instead when the step needs request signing, provider SDKs, pagination, response normalization, retries with provider-specific behavior, or file output.

## Request contract

An API call supports:

- `url`: the request URL
- `method`: the HTTP method
- `headers`: an optional map of literal request-header names to string values

Omitting `headers` sends no workflow-configured headers. RelayFold does not interpolate credentials into header values. Request bodies, query-parameter construction, request signing, and task-specific retry behavior are not part of API call tasks; use a Function task when you need those features.

## Response contract

A successful response becomes the complete task output:

```json
{
  "status": 200,
  "headers": {
    "content-type": "application/json"
  },
  "body": {
    "items": []
  }
}
```

Response header names use the normalized form returned by the HTTP runtime. When the response `content-type` is `application/json` or an `application/*+json` media type, `body` is parsed JSON. Other response bodies are strings.

Non-success HTTP statuses, network failures, invalid request configuration, and malformed responses that declare a JSON content type fail the task.

As with other task kinds, declare `input_schemas` and `output_schema` when downstream behavior depends on a specific shape. An API call's `output_schema` describes the complete `{ status, headers, body }` value. RelayFold validates that value without reshaping it before completing the task or passing it downstream.
