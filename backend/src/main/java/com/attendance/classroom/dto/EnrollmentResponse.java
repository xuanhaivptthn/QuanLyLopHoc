package com.attendance.classroom.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentResponse {
    private UUID enrollmentId;
    private UUID classroomId;
    private UUID studentId;
    private String studentCode;
    private String fullName;
    private String email;
    private String phone;
    private Instant enrolledAt;
}
