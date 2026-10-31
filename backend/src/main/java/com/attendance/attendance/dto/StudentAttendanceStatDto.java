package com.attendance.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentAttendanceStatDto {
    private UUID studentId;
    private String studentCode;
    private String fullName;
    private String email;
    private String phone;
    private long totalSessions;
    private long presentCount;
    private long lateCount;
    private long absentCount;
    private long excusedCount;
    private double attendanceRate; // percentage (0.0 to 100.0)
}
