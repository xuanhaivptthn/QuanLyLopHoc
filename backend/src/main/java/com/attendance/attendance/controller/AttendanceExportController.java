package com.attendance.attendance.controller;

import com.attendance.attendance.dto.ClassroomAttendanceSummaryResponse;
import com.attendance.attendance.service.AttendanceExportService;
import com.attendance.common.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping
@RequiredArgsConstructor
@Tag(name = "Attendance Reports & Export", description = "Endpoints for attendance summaries, analytics, and CSV roster exports")
@SecurityRequirement(name = "bearerAuth")
public class AttendanceExportController {

    private final AttendanceExportService exportService;

    @GetMapping("/classrooms/{classroomId}/attendance/report")
    @PreAuthorize("hasAnyRole('CENTER_ADMIN', 'TEACHER')")
    @Operation(summary = "Get aggregated attendance summary and student statistics for a classroom")
    public ResponseEntity<ClassroomAttendanceSummaryResponse> getClassroomAttendanceSummary(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID classroomId) {
        return ResponseEntity.ok(exportService.getClassroomAttendanceSummary(principal, classroomId));
    }

    @GetMapping("/classrooms/{classroomId}/attendance/export")
    @PreAuthorize("hasAnyRole('CENTER_ADMIN', 'TEACHER')")
    @Operation(summary = "Export classroom attendance summary report as CSV with UTF-8 BOM")
    public ResponseEntity<byte[]> exportClassroomAttendanceCsv(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID classroomId) {
        byte[] csvData = exportService.exportClassroomAttendanceReportCsv(principal, classroomId);
        String filename = "diem_danh_lop_" + classroomId.toString().substring(0, 8) + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CONTENT_TYPE, "text/csv; charset=UTF-8")
                .body(csvData);
    }

    @GetMapping("/sessions/{sessionId}/attendance/export")
    @PreAuthorize("hasAnyRole('CENTER_ADMIN', 'TEACHER')")
    @Operation(summary = "Export individual session roll-call attendance sheet as CSV with UTF-8 BOM")
    public ResponseEntity<byte[]> exportSessionAttendanceCsv(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID sessionId) {
        byte[] csvData = exportService.exportSessionAttendanceCsv(principal, sessionId);
        String filename = "diem_danh_buoi_hoc_" + sessionId.toString().substring(0, 8) + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CONTENT_TYPE, "text/csv; charset=UTF-8")
                .body(csvData);
    }
}
