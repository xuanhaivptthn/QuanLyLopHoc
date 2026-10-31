package com.attendance.attendance.dto;

import com.attendance.attendance.entity.SessionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionResponse {
    private UUID id;
    private UUID classroomId;
    private String classroomCode;
    private String classroomName;
    private LocalDate sessionDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private SessionStatus status;
    private String qrToken;
    private Instant qrExpiresAt;
    private long totalStudents;
    private long presentCount;
    private long lateCount;
    private long absentCount;
    private long excusedCount;
    private Instant createdAt;
}
