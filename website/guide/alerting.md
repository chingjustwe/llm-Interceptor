# Alerting

Alerting is best-effort and never blocks the request path.

## Rules

| Rule | Metric | Description |
|------|--------|-------------|
| high-error-rate | `error_rate` | Fires when error rate exceeds threshold over duration |
| budget-exhausted | `budget_threshold` | Fires when daily/session budget approaches limit |

## Channels

| Channel | Config Key | Description |
|---------|-----------|-------------|
| Slack | `slack_webhook_url` | Incoming webhook URL |
| Webhook | `webhook_url` | Generic HTTP endpoint |
| Email | `email_smtp` | SMTP server configuration |

## Example

```yaml
alerting:
  slack_webhook_url: "https://hooks.slack.com/services/..."
  rules:
    - name: "high-error-rate"
      metric: "error_rate"
      threshold: 0.1
      duration: "5m"
      channels: ["slack"]
      severity: "critical"
```
