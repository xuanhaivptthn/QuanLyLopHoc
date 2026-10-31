package com.attendance.student.dto;

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
public class StudentResponse {
    private UUID id;
    private String studentCode;
    private String fullName;
    private String email;
    private String phone;
    private String avatarUrl;
    private UUID organizationId;
    private UUID ownerTeacherId;
    private UUID userId;
    private Instant createdAt;
}
