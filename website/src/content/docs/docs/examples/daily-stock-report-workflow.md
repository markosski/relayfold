---
title: Daily Stock Report Workflow
description: Research stock prices and recent news, assess short-term trajectories, and email an HTML snapshot through Mailgun.
---

[`examples/example_daily_stock_report_workflow.yaml`](https://github.com/markosski/runhelm/blob/main/examples/example_daily_stock_report_workflow.yaml)
is a multi-agent example that builds and emails a dated stock report.

## Example output

[![Example daily stock report for Tesla showing its latest price, recent closes, trajectory, and news.](/runhelm/stock-report-tsla.png)](https://github.com/markosski/runhelm/blob/main/website/public/stock-report-tsla.png)

## Inputs

Start each run with an object containing one or more ticker symbols and the
report recipient email address:

```json
{
  "tickers": ["AAPL", "MSFT"],
  "recipient_email": "analyst@example.com"
}
```

## Credentials

Add the model, Twelve Data, and Mailgun credentials to the worker credential
store:

```json
{
  "gemini_api_key": "...",
  "twelve_data": "...",
  "mailgun_api_key": "...",
  "mailgun_domain": "mg.example.com",
  "mailgun_from": "RunHelm Reports <reports@mg.example.com>"
}
```

The Mailgun domain must be authorized to send from the configured address. The
example calls Mailgun's US API endpoint. For an EU-region domain, change the
endpoint in `send-report-email` to `https://api.eu.mailgun.net`.

## Flow

<pre class="mermaid">
flowchart TD
    Input["Tickers + recipient"]
    Fetch["fetch-market-data<br/>Twelve Data quote + daily history"]
    Market["analyze-market-data<br/>short-term trajectory"]
    News["research-recent-news<br/>last seven days"]
    HTML["compose-html-report<br/>email-safe HTML"]
    Mailgun["send-report-email<br/>Mailgun API"]
    Input --> Fetch
    Fetch --> Market
    Input --> News
    Market --> HTML
    News --> HTML
    HTML --> Mailgun
</pre>

`fetch-market-data` calls Twelve Data's `/quote` and `/time_series` endpoints
for each ticker. It uses API responses for prices and recent closes instead of
asking a model to find market values on public websites. `analyze-market-data`
then describes the observed short-term trajectory from those closes. The news
task runs independently and collects up to three recent, sourced items per
ticker through browser search.

The Twelve Data Basic (free) plan allows eight API credits per minute. Each ticker
uses two credits, so this demonstration intentionally accepts at most four
tickers and fetches them in parallel without rate-limit batching.

The composition task joins the results by ticker and produces a complete HTML
document with inline styles, source links, and a plain-text fallback. The final
Function task sends both representations through Mailgun. A Mailgun failure
fails the task instead of reporting a successful delivery.

The trajectory is a description of recent historical prices, not investment
advice or a prediction of future performance.

## Register the workflow

The root `fetch-market-data` and `research-recent-news` tasks each declare the
same object input schema. RunHelm validates the invocation body against those
schemas and exposes it to both tasks as `inputs[0]`.

```bash
export RUNHELM_URL=http://localhost:3000

curl -fsSL https://raw.githubusercontent.com/markosski/runhelm/main/examples/example_daily_stock_report_workflow.yaml \
  | curl -fsS -X POST "$RUNHELM_URL/workflow-def" \
      --data-binary @-
```

## Execute the workflow

```bash
curl -fsS -X POST "$RUNHELM_URL/workflow-def/daily-stock-report-workflow" \
  -H 'content-type: application/json' \
  -d '{
    "tickers": ["AAPL", "MSFT"],
    "recipient_email": "analyst@example.com"
  }'
```

## Check the output

After the workflow completes, replace `<workflow_id>` with the `id` returned
when you executed it and read the result of its final task:

```bash
curl -fsS "$RUNHELM_URL/workflows/<workflow_id>/tasks/send-report-email"
```
