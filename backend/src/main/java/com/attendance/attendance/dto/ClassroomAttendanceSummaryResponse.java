package com.attendance.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassroomAttendanceSummaryResponse {
    private UUID classroomId;
    private String classroomCode;
    private String classroomName;
    private String semester;
    private long totalSessions;
    private long totalEnrolledStudents;
    private double overallAttendanceRate; // average percentage
    private List<StudentAttendanceStatDto> studentStats;
}
