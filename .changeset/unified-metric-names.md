---
"@playwright-labs/reporter-prometheus-remote-write": minor
---

Feature: otel-compatible unified metric names for the auto-collected metrics.

The reporter now emits the same metric names and label semantics that `@playwright-labs/reporter-otel` uses, next to the legacy series (kept for backward compatibility, to be removed in the next major):

- `pw_tests_total{test_status,test_result,test_suite}` — one counter with labels, matching the OTel metric exactly
- `pw_test_retries_total`, `pw_test_error_count_total`, `pw_test_step_count_total` — named to match what the OTel Collector's Prometheus exporter produces from the OTel counterparts
- `pw_process_memory_*`, `pw_os_memory_free`, `pw_process_cpu_user/system` — aliases of the existing `pw_node_*` gauges under the OTel-style names (note: the OTel Collector additionally appends `_bytes` / `_microseconds` suffixes)
- `pw_run_duration` — wall-clock run duration (gauge), mirroring the OTel histogram

The grafana-stack example's Base dashboard now queries the shared names (`pw_tests_total`, `pw_test_retries_total`, `pw_test_step_count_total`, `pw_process_*`), so its key panels work against either reporter's data.
