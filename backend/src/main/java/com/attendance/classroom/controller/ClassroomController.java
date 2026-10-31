package com.attendance.classroom.controller;

import com.attendance.classroom.dto.BulkEnrollStudentsRequest;
import com.attendance.classroom.dto.BulkEnrollmentResponse;
import com.attendance.classroom.dto.BulkImportToClassroomResponse;
import com.attendance.classroom.dto.ClassroomResponse;
import com.attendance.classroom.dto.CreateClassroomRequest;
import com.attendance.classroom.dto.EnrollStudentRequest;
import com.attendance.classroom.dto.EnrollmentResponse;
import com.attendance.classroom.service.ClassroomService;
import com.attendance.common.security.UserPrincipal;
import com.attendance.student.dto.BulkCreateStudentRequest;
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
@RequestMapping("/classrooms")
@RequiredArgsConstructor
@Tag(name = "Classroom Management", description = "Endpoints for managing course sections and student enrollments")
@SecurityRequirement(name = "bearerAuth")
public class ClassroomController {

    private final ClassroomService classroomService;

    @PostMapping
    @PreAuthorize("hasAnyRole('CENTER_ADMIN', 'TEACHER')")
    @Operation(summary = "Create a new classroom section")
    public ResponseEntity<ClassroomResponse> createClassroom(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateClassroomRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(classroomService.createClassroom(principal, request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CENTER_ADMIN', 'TEACHER')")
    @Operation(summary = "Get list of classrooms accessible to current user")
    public ResponseEntity<List<ClassroomResponse>> getClassrooms(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(classroomService.getClassrooms(principal));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CENTER_ADMIN', 'TEACHER')")
    @Operation(summary = "Get classroom details by ID")
    public ResponseEntity<ClassroomResponse> getClassroomById(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(classroomService.getClassroomById(principal, id));
    }

    @GetMapping("/{id}/students")
    @PreAuthorize("hasAnyRole('CENTER_ADMIN', 'TEACHER')")
    @Operation(summary = "Get list of students enrolled in this classroom")
    public ResponseEntity<List<EnrollmentResponse>> getClassroomStudents(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(classroomService.getClassroomStudents(principal, id));
    }

    @PostMapping("/{id}/students")
    @PreAuthorize("hasAnyRole('CENTER_ADMIN', 'TEACHER')")
    @Operation(summary = "Enroll a student into the classroom")
    public ResponseEntity<EnrollmentResponse> enrollStudent(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody EnrollStudentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(classroomService.enrollStudent(principal, id, request));
    }

    @PostMapping("/{id}/students/bulk")
    @PreAuthorize("hasAnyRole('CENTER_ADMIN', 'TEACHER')")
    @Operation(summary = "Bulk enroll multiple existing students into classroom")
    public ResponseEntity<BulkEnrollmentResponse> bulkEnrollStudents(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody BulkEnrollStudentsRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(classroomService.bulkEnrollStudents(principal, id, request));
    }

    @PostMapping("/{id}/students/bulk-import")
    @PreAuthorize("hasAnyRole('CENTER_ADMIN', 'TEACHER')")
    @Operation(summary = "Bulk import students from roster and enroll them directly into classroom")
    public ResponseEntity<BulkImportToClassroomResponse> bulkImportToClassroom(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody BulkCreateStudentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(classroomService.bulkImportToClassroom(principal, id, request));
    }

    @DeleteMapping("/{id}/students/{studentId}")
    @PreAuthorize("hasAnyRole('CENTER_ADMIN', 'TEACHER')")
    @Operation(summary = "Remove a student from the classroom")
    public ResponseEntity<Void> removeStudent(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID studentId) {
        classroomService.removeStudent(principal, id, studentId);
        return ResponseEntity.noContent().build();
    }
}
