package com.attendance.common.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CsvSanitizerTest {

    @Test
    @DisplayName("Should handle null value by returning empty quoted string")
    void shouldHandleNullValue() {
        String result = CsvSanitizer.sanitizeCell(null);
        assertThat(result).isEqualTo("\"\"");
    }

    @Test
    @DisplayName("Should wrap normal string in double quotes")
    void shouldWrapNormalString() {
        String result = CsvSanitizer.sanitizeCell("Nguyễn Văn An");
        assertThat(result).isEqualTo("\"Nguyễn Văn An\"");
    }

    @Test
    @DisplayName("Should escape double quotes inside cell")
    void shouldEscapeDoubleQuotes() {
        String result = CsvSanitizer.sanitizeCell("Lớp \"Toán Cao Cấp\"");
        assertThat(result).isEqualTo("\"Lớp \"\"Toán Cao Cấp\"\"\"");
    }

    @Test
    @DisplayName("Should prevent CSV formula injection by prepending single quote for dangerous characters")
    void shouldPreventFormulaInjection() {
        assertThat(CsvSanitizer.sanitizeCell("=SUM(A1:A10)")).isEqualTo("\"'=SUM(A1:A10)\"");
        assertThat(CsvSanitizer.sanitizeCell("+cmd|' /C calc'!A0")).isEqualTo("\"'+cmd|' /C calc'!A0\"");
        assertThat(CsvSanitizer.sanitizeCell("-100")).isEqualTo("\"'-100\"");
        assertThat(CsvSanitizer.sanitizeCell("@alert(1)")).isEqualTo("\"'@alert(1)\"");
        assertThat(CsvSanitizer.sanitizeCell("\tsomething")).isEqualTo("\"'\tsomething\"");
        assertThat(CsvSanitizer.sanitizeCell("\rsomething")).isEqualTo("\"'\rsomething\"");
    }

    @Test
    @DisplayName("Should provide UTF-8 BOM prefix")
    void shouldProvideUtf8Bom() {
        assertThat(CsvSanitizer.UTF8_BOM).isEqualTo("\uFEFF");
    }
}
