package com.attendance.common.util;

/**
 * Utility for escaping and sanitizing CSV fields to protect against
 * CSV Formula Injection (CWE-1236) and properly format delimited values.
 */
public final class CsvSanitizer {

    private CsvSanitizer() {
        // Utility class
    }

    /**
     * Sanitizes a cell value for safe inclusion in a CSV file.
     * Prevents formula injection by prepending a single quote if the value begins
     * with '=', '+', '-', '@', '\t', or '\r'.
     * Encloses value in double quotes and escapes existing quotes.
     */
    public static String sanitizeCell(Object value) {
        if (value == null) {
            return "\"\"";
        }

        String str = value.toString();

        // Check if value starts with formula injection triggers
        if (!str.isEmpty()) {
            char first = str.charAt(0);
            if (first == '=' || first == '+' || first == '-' || first == '@' || first == '\t' || first == '\r') {
                str = "'" + str;
            }
        }

        // Escape double quotes by doubling them
        String escaped = str.replace("\"", "\"\"");
        return "\"" + escaped + "\"";
    }

    /**
     * UTF-8 Byte Order Mark (BOM) ensuring Excel correctly detects UTF-8 encoding (Vietnamese characters).
     */
    public static final String UTF8_BOM = "\uFEFF";
}
