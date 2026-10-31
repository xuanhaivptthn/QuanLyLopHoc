package com.attendance.attendance.controller;

import com.attendance.attendance.dto.*;
import com.attendance.attendance.service.AttendanceService;
import com.attendance.common.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping
@RequiredArgsConstructor
@Tag(name = "Attendance & Roll-Call", description = "Endpoints for managing attendance sessions, dynamic QR codes, student check-in, and roll-call records")
@SecurityRequirement(name = "bearerAuth")
public class AttendanceController {

    private final AttendanceService attendanceService;

    @PostMapping("/classrooms/{classroomId}/sessions")
    @PreAuthorize("hasAnyRole('CENTER_ADMIN', 'TEACHER')")
    @Operation(summary = "Create an attendance session for a classroom")
    public ResponseEntity<SessionResponse> createSession(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID classroomId,
            @Valid @RequestBody CreateSessionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(attendanceService.createSession(principal, classroomId, request));
    }

    @GetMapping("/classrooms/{classroomId}/sessions")
    @PreAuthorize("hasAnyRole('CENTER_ADMIN', 'TEACHER')")
    @Operation(summary = "Get list of attendance sessions for a classroom")
    public ResponseEntity<List<SessionResponse>> getClassroomSessions(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID classroomId) {
        return ResponseEntity.ok(attendanceService.getClassroomSessions(principal, classroomId));
    }

    @GetMapping("/sessions/{id}")
    @PreAuthorize("hasAnyRole('CENTER_ADMIN', 'TEACHER')")
    @Operation(summary = "Get attendance session details by ID")
    public ResponseEntity<SessionResponse> getSessionById(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(attendanceService.getSessionById(principal, id));
    }

    @PostMapping("/sessions/{id}/open-qr")
    @PreAuthorize("hasAnyRole('CENTER_ADMIN', 'TEACHER')")
    @Operation(summary = "Generate/refresh a 30-second dynamic QR code token for live attendance")
    public ResponseEntity<QrTokenResponse> generateDynamicQr(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(attendanceService.generateDynamicQr(principal, id));
    }

    @PostMapping("/sessions/{id}/check-in")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Student check-in by submitting scanned QR code token")
    public ResponseEntity<AttendanceRecordResponse> studentCheckIn(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody CheckInRequest request) {
        return ResponseEntity.ok(attendanceService.studentCheckIn(principal, id, request));
    }

    @GetMapping("/sessions/{id}/records")
    @PreAuthorize("hasAnyRole('CENTER_ADMIN', 'TEACHER')")
    @Operation(summary = "Get list of attendance records for a session")
    public ResponseEntity<List<AttendanceRecordResponse>> getSessionRecords(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(attendanceService.getSessionRecords(principal, id));
    }

    @PutMapping("/sessions/{id}/records")
    @PreAuthorize("hasAnyRole('CENTER_ADMIN', 'TEACHER')")
    @Operation(summary = "Manual bulk roll-call update for a session")
    public ResponseEntity<List<AttendanceRecordResponse>> bulkUpdateRecords(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody BulkUpdateRecordsRequest request) {
        return ResponseEntity.ok(attendanceService.bulkUpdateRecords(principal, id, request));
    }
}
