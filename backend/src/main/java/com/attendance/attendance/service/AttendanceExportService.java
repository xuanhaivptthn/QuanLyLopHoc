package com.attendance.attendance.service;

import com.attendance.attendance.dto.ClassroomAttendanceSummaryResponse;
import com.attendance.attendance.dto.StudentAttendanceStatDto;
import com.attendance.attendance.entity.AttendanceRecord;
import com.attendance.attendance.entity.AttendanceSession;
import com.attendance.attendance.entity.AttendanceStatus;
import com.attendance.attendance.repository.AttendanceRecordRepository;
import com.attendance.attendance.repository.AttendanceSessionRepository;
import com.attendance.classroom.entity.Classroom;
import com.attendance.classroom.entity.Enrollment;
import com.attendance.classroom.repository.ClassroomRepository;
import com.attendance.classroom.repository.EnrollmentRepository;
import com.attendance.common.exception.ForbiddenException;
import com.attendance.common.exception.ResourceNotFoundException;
import com.attendance.common.security.UserPrincipal;
import com.attendance.common.util.CsvSanitizer;
import com.attendance.student.entity.Student;
import com.attendance.user.entity.Role;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AttendanceExportService {

    private final ClassroomRepository classroomRepository;
    private final AttendanceSessionRepository sessionRepository;
    private final AttendanceRecordRepository recordRepository;
    private final EnrollmentRepository enrollmentRepository;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss");

    @Transactional(readOnly = true)
    public ClassroomAttendanceSummaryResponse getClassroomAttendanceSummary(UserPrincipal principal, UUID classroomId) {
        Classroom classroom = classroomRepository.findByIdWithDetails(classroomId)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom", "id", classroomId));

        assertAccess(principal, classroom);

        List<AttendanceSession> sessions = sessionRepository.findAllByClassroomIdOrderByDateDesc(classroomId);
        List<Enrollment> enrollments = enrollmentRepository.findAllByClassroomIdWithStudent(classroomId);

        if (enrollments.isEmpty()) {
            return ClassroomAttendanceSummaryResponse.builder()
                    .classroomId(classroom.getId())
                    .classroomCode(classroom.getCode())
                    .classroomName(classroom.getName())
                    .semester(classroom.getSemester())
                    .totalSessions(sessions.size())
                    .totalEnrolledStudents(0)
                    .overallAttendanceRate(0.0)
                    .studentStats(List.of())
                    .build();
        }

        List<UUID> sessionIds = sessions.stream().map(AttendanceSession::getId).toList();
        List<AttendanceRecord> allRecords = sessionIds.isEmpty()
                ? List.of()
                : recordRepository.findAll().stream()
                    .filter(r -> sessionIds.contains(r.getSession().getId()))
                    .toList();

        // Group records by student ID
        Map<UUID, List<AttendanceRecord>> recordsByStudent = allRecords.stream()
                .collect(Collectors.groupingBy(r -> r.getStudent().getId()));

        long totalSessionsCount = sessions.size();
        List<StudentAttendanceStatDto> studentStats = new ArrayList<>();
        double totalRateSum = 0.0;

        for (Enrollment enrollment : enrollments) {
            Student student = enrollment.getStudent();
            List<AttendanceRecord> studentRecords = recordsByStudent.getOrDefault(student.getId(), List.of());

            long present = studentRecords.stream().filter(r -> r.getStatus() == AttendanceStatus.PRESENT).count();
            long late = studentRecords.stream().filter(r -> r.getStatus() == AttendanceStatus.LATE).count();
            long absent = studentRecords.stream().filter(r -> r.getStatus() == AttendanceStatus.ABSENT).count();
            long excused = studentRecords.stream().filter(r -> r.getStatus() == AttendanceStatus.EXCUSED).count();

            double rate = totalSessionsCount > 0
                    ? Math.round(((double) (present + late) / totalSessionsCount) * 1000.0) / 10.0
                    : 0.0;
            totalRateSum += rate;

            studentStats.add(StudentAttendanceStatDto.builder()
                    .studentId(student.getId())
                    .studentCode(student.getStudentCode())
                    .fullName(student.getFullName())
                    .email(student.getEmail())
                    .phone(student.getPhone())
                    .totalSessions(totalSessionsCount)
                    .presentCount(present)
                    .lateCount(late)
                    .absentCount(absent)
                    .excusedCount(excused)
                    .attendanceRate(rate)
                    .build());
        }

        // Sort students by studentCode
        studentStats.sort(Comparator.comparing(StudentAttendanceStatDto::getStudentCode));

        double overallRate = enrollments.isEmpty()
                ? 0.0
                : Math.round((totalRateSum / enrollments.size()) * 10.0) / 10.0;

        return ClassroomAttendanceSummaryResponse.builder()
                .classroomId(classroom.getId())
                .classroomCode(classroom.getCode())
                .classroomName(classroom.getName())
                .semester(classroom.getSemester())
                .totalSessions(totalSessionsCount)
                .totalEnrolledStudents(enrollments.size())
                .overallAttendanceRate(overallRate)
                .studentStats(studentStats)
                .build();
    }

    @Transactional(readOnly = true)
    public byte[] exportClassroomAttendanceReportCsv(UserPrincipal principal, UUID classroomId) {
        ClassroomAttendanceSummaryResponse summary = getClassroomAttendanceSummary(principal, classroomId);

        StringBuilder sb = new StringBuilder();
        sb.append(CsvSanitizer.UTF8_BOM);

        // Metadata Header rows
        sb.append("# BÁO CÁO ĐIỂM DANH LỚP HỌC\n");
        sb.append("# Mã lớp: ").append(summary.getClassroomCode()).append(" - ").append(summary.getClassroomName()).append("\n");
        sb.append("# Học kỳ: ").append(summary.getSemester()).append("\n");
        sb.append("# Tổng số buổi học: ").append(summary.getTotalSessions())
          .append(" | Tổng số sinh viên: ").append(summary.getTotalEnrolledStudents())
          .append(" | Tỷ lệ điểm danh chung: ").append(summary.getOverallAttendanceRate()).append("%\n");
        sb.append("\n");

        // Table Column Headers
        sb.append(String.join(",",
                CsvSanitizer.sanitizeCell("STT"),
                CsvSanitizer.sanitizeCell("Mã Sinh Viên"),
                CsvSanitizer.sanitizeCell("Họ và Tên"),
                CsvSanitizer.sanitizeCell("Email"),
                CsvSanitizer.sanitizeCell("Số Điện Thoại"),
                CsvSanitizer.sanitizeCell("Tổng Buổi Học"),
                CsvSanitizer.sanitizeCell("Có Mặt"),
                CsvSanitizer.sanitizeCell("Đi Muộn"),
                CsvSanitizer.sanitizeCell("Vắng Mặt"),
                CsvSanitizer.sanitizeCell("Có Phép"),
                CsvSanitizer.sanitizeCell("Tỷ Lệ Tham Gia (%)")
        )).append("\n");

        // Data Rows
        int stt = 1;
        for (StudentAttendanceStatDto stat : summary.getStudentStats()) {
            sb.append(String.join(",",
                    CsvSanitizer.sanitizeCell(stt++),
                    CsvSanitizer.sanitizeCell(stat.getStudentCode()),
                    CsvSanitizer.sanitizeCell(stat.getFullName()),
                    CsvSanitizer.sanitizeCell(stat.getEmail()),
                    CsvSanitizer.sanitizeCell(stat.getPhone() != null ? stat.getPhone() : ""),
                    CsvSanitizer.sanitizeCell(stat.getTotalSessions()),
                    CsvSanitizer.sanitizeCell(stat.getPresentCount()),
                    CsvSanitizer.sanitizeCell(stat.getLateCount()),
                    CsvSanitizer.sanitizeCell(stat.getAbsentCount()),
                    CsvSanitizer.sanitizeCell(stat.getExcusedCount()),
                    CsvSanitizer.sanitizeCell(stat.getAttendanceRate() + "%")
            )).append("\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    @Transactional(readOnly = true)
    public byte[] exportSessionAttendanceCsv(UserPrincipal principal, UUID sessionId) {
        AttendanceSession session = sessionRepository.findByIdWithClassroom(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("AttendanceSession", "id", sessionId));

        assertAccess(principal, session.getClassroom());

        List<AttendanceRecord> records = recordRepository.findAllBySessionIdWithStudent(sessionId);

        StringBuilder sb = new StringBuilder();
        sb.append(CsvSanitizer.UTF8_BOM);

        // Metadata Header rows
        sb.append("# DANH SÁCH ĐIỂM DANH BUỔI HỌC\n");
        sb.append("# Lớp: ").append(session.getClassroom().getCode()).append(" - ").append(session.getClassroom().getName()).append("\n");
        sb.append("# Ngày: ").append(session.getSessionDate())
          .append(" | Giờ: ").append(session.getStartTime()).append(" - ").append(session.getEndTime())
          .append(" | Trạng thái: ").append(session.getStatus()).append("\n");
        sb.append("\n");

        // Column Headers
        sb.append(String.join(",",
                CsvSanitizer.sanitizeCell("STT"),
                CsvSanitizer.sanitizeCell("Mã Sinh Viên"),
                CsvSanitizer.sanitizeCell("Họ và Tên"),
                CsvSanitizer.sanitizeCell("Email"),
                CsvSanitizer.sanitizeCell("Số Điện Thoại"),
                CsvSanitizer.sanitizeCell("Trạng Thái Điểm Danh"),
                CsvSanitizer.sanitizeCell("Thời Gian Điểm Danh"),
                CsvSanitizer.sanitizeCell("Ghi Chú")
        )).append("\n");

        int stt = 1;
        for (AttendanceRecord record : records) {
            Student student = record.getStudent();
            String statusLabel = switch (record.getStatus()) {
                case PRESENT -> "Có mặt";
                case LATE -> "Đi muộn";
                case ABSENT -> "Vắng mặt";
                case EXCUSED -> "Có phép";
            };

            String checkInTimeStr = record.getCheckInTime() != null
                    ? java.time.LocalDateTime.ofInstant(record.getCheckInTime(), java.time.ZoneId.systemDefault()).format(TIME_FORMATTER)
                    : "";

            sb.append(String.join(",",
                    CsvSanitizer.sanitizeCell(stt++),
                    CsvSanitizer.sanitizeCell(student.getStudentCode()),
                    CsvSanitizer.sanitizeCell(student.getFullName()),
                    CsvSanitizer.sanitizeCell(student.getEmail()),
                    CsvSanitizer.sanitizeCell(student.getPhone() != null ? student.getPhone() : ""),
                    CsvSanitizer.sanitizeCell(statusLabel),
                    CsvSanitizer.sanitizeCell(checkInTimeStr),
                    CsvSanitizer.sanitizeCell(record.getRemarks() != null ? record.getRemarks() : "")
            )).append("\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private void assertAccess(UserPrincipal principal, Classroom classroom) {
        if (principal.getRole() == Role.SUPER_ADMIN) return;

        if (classroom.getOrganization() != null) {
            UUID orgId = classroom.getOrganization().getId();
            if (orgId.equals(principal.getActiveOrganizationId())) {
                if (principal.getRole() == Role.CENTER_ADMIN) return;
                if (classroom.getTeacher().getId().equals(principal.getId())) return;
            }
        } else {
            if (classroom.getTeacher().getId().equals(principal.getId())) return;
        }

        throw new ForbiddenException("You do not have access to this classroom's attendance records.");
    }
}
