package com.attendance.student.controller;

import com.attendance.common.security.UserPrincipal;
import com.attendance.student.dto.BulkCreateStudentRequest;
import com.attendance.student.dto.BulkCreateStudentResponse;
import com.attendance.student.dto.CreateStudentRequest;
import com.attendance.student.dto.StudentResponse;
import com.attendance.student.service.StudentService;
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
@RequestMapping("/students")
@RequiredArgsConstructor
@Tag(name = "Student Directory", description = "Endpoints for managing student profiles and records")
@SecurityRequirement(name = "bearerAuth")
public class StudentController {

    private final StudentService studentService;

    @PostMapping
    @PreAuthorize("hasAnyRole('CENTER_ADMIN', 'TEACHER')")
    @Operation(summary = "Create a new student in the center or personal directory")
    public ResponseEntity<StudentResponse> createStudent(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateStudentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(studentService.createStudent(principal, request));
    }

    @PostMapping("/bulk")
    @PreAuthorize("hasAnyRole('CENTER_ADMIN', 'TEACHER')")
    @Operation(summary = "Bulk create multiple students in the center or personal directory")
    public ResponseEntity<BulkCreateStudentResponse> bulkCreateStudents(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody BulkCreateStudentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(studentService.bulkCreateStudents(principal, request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CENTER_ADMIN', 'TEACHER')")
    @Operation(summary = "Get list of students in the current tenant/directory")
    public ResponseEntity<List<StudentResponse>> getStudents(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(studentService.getStudents(principal));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CENTER_ADMIN', 'TEACHER')")
    @Operation(summary = "Get student profile details by ID")
    public ResponseEntity<StudentResponse> getStudentById(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(studentService.getStudentById(principal, id));
    }
}
