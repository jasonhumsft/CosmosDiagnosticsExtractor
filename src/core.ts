import * as vscode from 'vscode';

/**
 * Unquotes a CSV string, removing surrounding quotes and escaping characters.
 *
 * @param csvString - The CSV string to unquote.
 * @returns The unquoted string.
 */
function unquoteCsvString(csvString: string): string {
    if (csvString.startsWith('"') && csvString.endsWith('"')) {
        csvString = csvString.slice(1, -1);
    }
    return csvString.replace(/""/g, '"');
}


/**
 * 
 * @param jsonString - The JSON string to unescape.
 * @returns The unescaped JSON string.
 * This function replaces escaped double quotes and backslashes with their actual values.
 */
function unescapeJsonInString(jsonString: string): string {
    // Unescape JSON string by replacing escaped characters with their actual values
    return jsonString.replace(/\\\"/g, '"').replace(/\\\\/g, '\\');
}

// The keyword to search for in the log string
// This is the string that indicates the start of the log section we want to extract
const keywordToSearch = 'Diagnostics';
const keywordLength = keywordToSearch.length;

// The keyword that must be present in the log section to be considered valid
// This is the string that indicates the log section is related to Cosmos Diagnostics
const keywordMustBePresent = 'Agent';

/**
 * Finds the start and end of the log section in the given string.
 * Start is the first '{' after the string 'Diagnostics', and end is the first matching '}'.
 * There might be multiple '{' and '}' in the log, so we need to find the first matching pair.
 *
 * @param log - The log string to analyze.
 * @returns A tuple containing the start and end indices, or [null, null] if not found.
 */
function findLogStartAndEnd(log: string): [number | null, number | null] {
    let start: number | null = null;
    let end: number | null = null;
    const stack: number[] = [];
    const logLength = log.length;


    // Find the first occurrence of the keyword 'Diagnostics' in the log string
    // and then find the first '{' after it.
    // This is the start of the log section.
    // We use a stack to keep track of nested braces.
    // When we find a matching '}', we set the end index.
    // If we find another '{' before finding a matching '}', we push it onto the stack.
    // When the stack is empty, we have found the matching '}' for the first '{'.
    // We return the start and end indices.
    // If we don't find a matching pair of '{' and '}', we return [null, null].
    // If we don't find the keyword 'Diagnostics', we return [null, null].

    const keywordIndex = log.indexOf(keywordToSearch);
    if (keywordIndex !== -1) {
        const idx = log.substring(keywordIndex + keywordLength).indexOf('{');
        if (idx !== -1) {
            start = keywordIndex + keywordLength + idx;
            stack.push(start);
        }
    }

    if (start !== null) {
        for (let i = start + 1; i < logLength; i++) {
            const char = log[i];
            if (char === '{') {
                stack.push(i);
            } else if (char === '}') {
                stack.pop();
                if (stack.length === 0) {
                    end = i;
                    break;
                }
            }
        }
        if (end === null) {
            start = null; // Reset start if no matching end is found
        }
    }

    return [start, end];
}

function findAndFixJsonString(log: string): [string | null, boolean] {
    let start: number | null = null;
    let end: number | null = null;
    let result: string | null = null;
    let fixed = false;
    const stack: string[] = [];

    const logLength = log.length;
    if (log.includes(keywordMustBePresent)) {
        const idx = log.indexOf('{');
        if (idx !== -1) {
            start = idx;
            stack.push('{');
            for (let i = start + 1; i < logLength; i++) {
                const char = log[i];
                if (char === '{' || char === '[') {
                    stack.push(char);
                } else if (char === '}' || char === ']') {
                    const last = stack.pop();
                    if (last === '{' && char === '}') {
                        // Matching pair found, do nothing
                    } else if (last === '[' && char === ']') {
                        // Matching pair found, do nothing
                    } else {
                        // Mismatched pair, handle accordingly
                        console.error('Mismatched braces or brackets in JSON string.');
                        return [null, false]; // Return the original log if mismatched
                    }
                }
                else if (char === '"' || char === "'") {
                    if (stack.length > 0 && stack[stack.length - 1] === char) {
                        stack.pop(); // Closing quote found, pop from stack
                    } else {
                        stack.push(char); // Opening quote found, push to stack
                    }
                }
                if (stack.length === 0) {
                    end = i;
                    break;
                }
            }
            if (end !== null) {
                result = log.substring(start, end + 1);
            }
            if (end === null && stack.length > 0) {
                result = log.substring(start); // Return the remaining string if not found
                while (stack.length > 0) {
                    const char = stack.pop();
                    if (char === '{') {
                        result += '}'; // Add closing brace for '{'
                    } else if (char === '[') {
                        result += ']'; // Add closing bracket for '['
                    }
                    else if (char === '"') {
                        result += '"'; // Add closing quote for '"'
                    } else if (char === "'") {
                        result += "'"; // Add closing quote for "'"
                    }
                }
                fixed = true; // Mark as fixed
            }

            // console.debug(`Extracted JSON string: ${result}`);
            // Validate if the result is a valid JSON string
            if (result) {
                try {
                    JSON.parse(result);
                    // console.debug('Validated JSON string successfully.');
                } catch (error) {
                    // console.error('Validation failed. Invalid JSON string:', result);
                    if (result.endsWith('}') && result.includes(',')) {
                        const lastCommaIndex = result.lastIndexOf(',');
                        const firstBracketIndex = result.indexOf('}', lastCommaIndex);
                        if (lastCommaIndex !== -1 && firstBracketIndex > lastCommaIndex) {
                            const potentialKeyValuePair = result.substring(lastCommaIndex + 1, firstBracketIndex).trim();
                            if (!/^\s*"[^"]*"\s*:\s*.+$/.test(potentialKeyValuePair)) {
                                result = result.substring(0, lastCommaIndex) + result.substring(firstBracketIndex);
                                fixed = true; // Mark as fixed since we removed an invalid key-value pair
                            }
                        }
                    }
                }
            }



        }
    }
    return [result, fixed];
}

export function extractCosmosDiagnostics() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const document = editor.document;
        const fileName = document.fileName;
        console.debug(`Current file name: ${fileName}`);
        const fileExtension = fileName.split('.').pop();
        console.debug(`File extension: ${fileExtension}`);

        var text: string = document.getText();
        if (fileExtension === 'csv') {
            console.debug('CSV file detected. Unquoting CSV string...');
            text = unquoteCsvString(text);
        }

        var start: number | null = null;
        var end: number | null = null;
        const result: any[] = [];
        [start, end] = findLogStartAndEnd(text);
        console.debug(`Start: ${start}, End: ${end}`);
        let tryEscape = false;
        while (start !== null && end !== null) {
            let logSection = text.substring(start, end + 1);
            if (tryEscape) {
                logSection = unescapeJsonInString(logSection);
            }
            let jsonObject;

            // Check if the log section contains 'Agent' to determine if it's a valid Cosmos Diagnostics log
            if (logSection.includes(keywordMustBePresent)) {
                try {
                    jsonObject = JSON.parse(logSection);
                    console.log('Deserialized JSON object:', jsonObject);
                    result.push(jsonObject);
                } catch (error) {
                    console.error('Failed to deserialize JSON:', error);
                    console.debug('Raw log:', logSection);
                    if (error instanceof SyntaxError && !tryEscape) {
                        // If JSON parsing fails, try to escape the string and parse again
                        tryEscape = true;
                        console.debug('Retry by escaping JSON string...');
                        continue;
                    }
                    const errorMessage = error instanceof Error ? error.message : String(error);

                    console.debug(`Failed to deserialize JSON. Error: ${errorMessage}`);

                    // skip this log section
                    if (start + keywordLength < text.length) {
                        console.debug(`Skipping to next log section...`);
                        text = text.substring(start + keywordLength);
                        [start, end] = findLogStartAndEnd(text);
                        continue;
                    } else {
                        break;
                    }
                }
            }
            if (end + 1 < text.length) {
                text = text.substring(end + 1);
                [start, end] = findLogStartAndEnd(text);
            } else {
                break;
            }
        }
        if (result.length > 0) {
            const jsonString = JSON.stringify(result, null, 2);
            vscode.workspace.openTextDocument({ content: jsonString, language: 'json' }).then((doc) => {
                vscode.window.showTextDocument(doc, { preview: false });
            });
        } else {
            vscode.window.showErrorMessage('No valid Cosmos Diagnostics found in the log file.');
        }

    } else {
        vscode.window.showErrorMessage('Please open a log file to extract Cosmos Diagnostics.');
    }
}

export function extractInCompleteCosmosDiagnostics() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const document = editor.document;
        const fileName = document.fileName;
        console.debug(`Current file name: ${fileName}`);
        const fileExtension = fileName.split('.').pop();
        console.debug(`File extension: ${fileExtension}`);

        const result: any[] = [];
        let resultFixed = false;
        for (let i = 0; i < document.lineCount; i++) {
            let line = document.lineAt(i).text;
            if (fileExtension === 'csv') {
                // console.debug('CSV file detected. Unquoting CSV string...');
                line = unquoteCsvString(line);
            }
            const [jsonString, fixed] = findAndFixJsonString(line);
            if (jsonString) {
                if (fixed) {
                    resultFixed = true;
                }
                try {
                    const jsonObject = JSON.parse(jsonString);
                    // console.log('Deserialized JSON object:', jsonObject);
                    result.push(jsonObject);
                } catch (error) {
                    console.error('Failed to deserialize JSON:', error);
                    console.debug('Raw json string:', jsonString);
                }
            }
        }
        if (result.length > 0) {
            const jsonString = JSON.stringify(result, null, 2);
            vscode.workspace.openTextDocument({ content: jsonString, language: 'json' }).then((doc) => {
                vscode.window.showTextDocument(doc, { preview: false });
                if (resultFixed) {
                    vscode.window.showInformationMessage('Incomplete Cosmos Diagnostics found and fixed. Please note some information might be missing.');
                }
            });
        } else {
            vscode.window.showErrorMessage('No Cosmos Diagnostics found in the log file.');
        }
    }
}
