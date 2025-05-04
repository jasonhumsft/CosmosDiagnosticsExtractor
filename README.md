# CosmosDiagnosticsExtractor

A Visual Studio Code extension designed to streamline the extraction and formatting of Cosmos DB diagnostics from log files.

## Overview

Cosmos DB SDK diagnostics are essential for troubleshooting connectivity and service availability issues. However, these diagnostics are often embedded within unstructured logs, making it challenging to locate and interpret critical details. Additionally, diagnostics strings may be quoted or escaped, further complicating their readability.

CosmosDiagnosticsExtractor addresses these challenges by extracting valid diagnostics strings in JSON format, unescaping or unquoting them as needed, and presenting them in a clean, readable structure.

## Features

- **Log Parsing**: Extracts Cosmos DB diagnostics strings from JSON, CSV, or plain text log files.
- **Simplified Output**: Removes unnecessary quoting or escaping to enhance clarity.
- **Readable Formatting**: Converts diagnostics into a well-structured JSON format for easier analysis.

## Limitations

This extension provides a best-effort approach to extract and format diagnostics information. However, it may not include all original error messages. For complete context, always refer to the original log file.

