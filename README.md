# CosmosDiagnosticsExtractor README

A tool designed to extract and format Cosmos DB diagnostics from log files.

## Features

Cosmos DB SDK diagnostics play a crucial role in investigating connectivity or service availability issues. However, diagnostics information is often buried within unstructured logs, making it difficult to identify and interpret key details. Additionally, diagnostics strings may be quoted or escaped, further complicating readability.

This extension simplifies the process by extracting all valid diagnostics strings in JSON format, unquoting or unescaping them when necessary, and presenting them in a prettified, easy-to-read format.

### Key Benefits:
- Extracts Cosmos DB diagnostics strings from JSON, CSV, or plain text log files.
- Formats diagnostics into a readable JSON structure.
- Removes unnecessary quoting or escaping for better clarity.

### Important Notes:
While this extension makes a best-effort attempt to extract and format key diagnostics information, the original error messages may not always be included in the output. For complete context, always refer to the original log file.
