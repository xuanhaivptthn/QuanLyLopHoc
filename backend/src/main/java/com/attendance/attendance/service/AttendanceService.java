package com.attendance.attendance.service;

import com.attendance.attendance.dto.*;
import com.attendance.attendance.entity.AttendanceRecord;
import com.attendance.attendance.entity.AttendanceSession;
import com.attendance.attendance.entity.AttendanceStatus;
import com.attendance.attendance.entity.SessionStatus;
import com.attendance.attendance.repository.AttendanceRecordRepository;
import com.attendance.attendance.repository.AttendanceSessionRepository;
import com.attendance.classroom.entity.Classroom;
import com.attendance.classroom.entity.Enrollment;
import com.attendance.classroom.repository.ClassroomRepository;
import com.attendance.classroom.repository.EnrollmentRepository;
import com.attendance.common.exception.BadRequestException;
import com.attendance.common.exception.ForbiddenException;
import com.attendance.common.exception.ResourceNotFoundException;
import com.attendance.common.security.UserPrincipal;
import com.attendance.student.entity.Student;
import com.attendance.student.repository.StudentRepository;
import com.attendance.user.entity.Role;
import com.attendance.user.entity.User;
import com.attendance.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceSessionRepository sessionRepository;
    private final AttendanceRecordRepository recordRepository;
    private final ClassroomRepository classroomRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;

    @Transactional
    public SessionResponse createSession(UserPrincipal principal, UUID classroomId, CreateSessionRequest request) {
        Classroom classroom = classroomRepository.findByIdWithDetails(classroomId)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom", "id", classroomId));

        assertTeacherOrAdminAccess(principal, classroom);

        if (request.getEndTime().isBefore(request.getStartTime())) {
            throw new BadRequestException("Session end time must be after start time.");
        }

        AttendanceSession session = AttendanceSession.builder()
                .classroom(classroom)
                .sessionDate(request.getSessionDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status(SessionStatus.SCHEDULED)
                .build();

        session = sessionRepository.save(session);

        List<Enrollment> enrollments = enrollmentRepository.findAllByClassroomIdWithStudent(classroomId);
        if (!enrollments.isEmpty()) {
            final AttendanceSession finalSession = session;
            List<AttendanceRecord> initialRecords = enrollments.stream()
                    .map(enrollment -> AttendanceRecord.builder()
                            .session(finalSession)
                            .student(enrollment.getStudent())
                            .status(AttendanceStatus.ABSENT)
                            .build())
                    .toList();
            recordRepository.saveAll(initialRecords);
        }

        log.info("Created attendance session {} for classroom {} with {} students",
                session.getId(), classroom.getCode(), enrollments.size());

        return mapToSessionResponse(session);
    }

    @Transactional(readOnly = true)
    public List<SessionResponse> getClassroomSessions(UserPrincipal principal, UUID classroomId) {
        Classroom classroom = classroomRepository.findByIdWithDetails(classroomId)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom", "id", classroomId));

        assertTeacherOrAdminAccess(principal, classroom);

        List<AttendanceSession> sessions = sessionRepository.findAllByClassroomIdOrderByDateDesc(classroomId);
        if (sessions.isEmpty()) {
            return List.of();
        }

        List<UUID> sessionIds = sessions.stream().map(AttendanceSession::getId).toList();
        Map<UUID, Map<AttendanceStatus, Long>> countsBySession = new java.util.HashMap<>();
        for (Object[] row : recordRepository.countRecordsBySessionIdsAndStatus(sessionIds)) {
            UUID sessId = (UUID) row[0];
            AttendanceStatus status = (AttendanceStatus) row[1];
            long count = ((Number) row[2]).longValue();
            countsBySession.computeIfAbsent(sessId, k -> new java.util.EnumMap<>(AttendanceStatus.class))
                    .put(status, count);
        }

        return sessions.stream()
                .map(s -> mapToSessionResponseWithCounts(s, countsBySession.getOrDefault(s.getId(), java.util.Collections.emptyMap())))
                .toList();
    }

    @Transactional(readOnly = true)
    public SessionResponse getSessionById(UserPrincipal principal, UUID sessionId) {
        AttendanceSession session = sessionRepository.findByIdWithClassroom(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("AttendanceSession", "id", sessionId));

        assertTeacherOrAdminAccess(principal, session.getClassroom());

        return mapToSessionResponse(session);
    }

    @Transactional
    public QrTokenResponse generateDynamicQr(UserPrincipal principal, UUID sessionId) {
        AttendanceSession session = sessionRepository.findByIdWithClassroom(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("AttendanceSession", "id", sessionId));

        assertTeacherOrAdminAccess(principal, session.getClassroom());

        String token = UUID.randomUUID().toString();
        Instant expiresAt = Instant.now().plus(30, ChronoUnit.SECONDS);

        session.setQrToken(token);
        session.setQrExpiresAt(expiresAt);
        if (session.getStatus() == SessionStatus.SCHEDULED) {
            session.setStatus(SessionStatus.ACTIVE);
        }

        sessionRepository.save(session);

        return QrTokenResponse.builder()
                .sessionId(session.getId())
                .qrToken(token)
                .expiresAt(expiresAt)
                .validitySeconds(30)
                .build();
    }

    @Transactional
    public AttendanceRecordResponse studentCheckIn(UserPrincipal principal, UUID sessionId, CheckInRequest request) {
        AttendanceSession session = sessionRepository.findByIdWithClassroom(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("AttendanceSession", "id", sessionId));

        if (!session.isQrValid(request.getQrToken())) {
            throw new BadRequestException("QR Code has expired or is invalid. Please scan the current code displayed on the screen.");
        }

        Student student = studentRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new BadRequestException("No student profile linked to your user account. Please contact your instructor."));

        AttendanceRecord record = recordRepository.findBySessionIdAndStudentId(sessionId, student.getId())
                .orElseThrow(() -> new BadRequestException("You are not enrolled in this session's class."));

        if (record.getStatus() == AttendanceStatus.PRESENT || record.getStatus() == AttendanceStatus.LATE) {
            return mapToRecordResponse(record);
        }

        LocalTime nowTime = LocalTime.now();
        LocalTime lateThreshold = session.getStartTime().plusMinutes(15);
        AttendanceStatus newStatus = nowTime.isAfter(lateThreshold) ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

        record.setStatus(newStatus);
        record.setCheckInTime(Instant.now());
        record = recordRepository.save(record);

        log.info("Student {} ({}) checked in to session {} with status {}",
                student.getFullName(), student.getStudentCode(), sessionId, newStatus);

        return mapToRecordResponse(record);
    }

    @Transactional(readOnly = true)
    public List<AttendanceRecordResponse> getSessionRecords(UserPrincipal principal, UUID sessionId) {
        AttendanceSession session = sessionRepository.findByIdWithClassroom(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("AttendanceSession", "id", sessionId));

        assertTeacherOrAdminAccess(principal, session.getClassroom());

        return recordRepository.findAllBySessionIdWithStudent(sessionId).stream()
                .map(this::mapToRecordResponse)
                .toList();
    }

    @Transactional
    public List<AttendanceRecordResponse> bulkUpdateRecords(UserPrincipal principal, UUID sessionId, BulkUpdateRecordsRequest request) {
        AttendanceSession session = sessionRepository.findByIdWithClassroom(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("AttendanceSession", "id", sessionId));

        assertTeacherOrAdminAccess(principal, session.getClassroom());

        User teacher = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", principal.getId()));

        List<AttendanceRecord> records = recordRepository.findAllBySessionIdWithStudent(sessionId);
        Map<UUID, AttendanceRecord> recordMap = records.stream()
                .collect(Collectors.toMap(AttendanceRecord::getId, r -> r));

        for (UpdateRecordItem item : request.getRecords()) {
            AttendanceRecord record = recordMap.get(item.getRecordId());
            if (record != null) {
                record.setStatus(item.getStatus());
                if (item.getRemarks() != null) {
                    record.setRemarks(item.getRemarks());
                }
                record.setRecordedBy(teacher);
                if (item.getStatus() == AttendanceStatus.PRESENT || item.getStatus() == AttendanceStatus.LATE) {
                    if (record.getCheckInTime() == null) {
                        record.setCheckInTime(Instant.now());
                    }
                }
            }
        }

        records = recordRepository.saveAll(records);
        log.info("Bulk updated {} attendance records for session {}", request.getRecords().size(), sessionId);

        return records.stream()
                .map(this::mapToRecordResponse)
                .toList();
    }

    private void assertTeacherOrAdminAccess(UserPrincipal principal, Classroom classroom) {
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

        throw new ForbiddenException("You do not have access to this session.");
    }

    private SessionResponse mapToSessionResponse(AttendanceSession session) {
        long present = recordRepository.countBySessionIdAndStatus(session.getId(), AttendanceStatus.PRESENT);
        long late = recordRepository.countBySessionIdAndStatus(session.getId(), AttendanceStatus.LATE);
        long absent = recordRepository.countBySessionIdAndStatus(session.getId(), AttendanceStatus.ABSENT);
        long excused = recordRepository.countBySessionIdAndStatus(session.getId(), AttendanceStatus.EXCUSED);
        long total = present + late + absent + excused;

        return SessionResponse.builder()
                .id(session.getId())
                .classroomId(session.getClassroom().getId())
                .classroomCode(session.getClassroom().getCode())
                .classroomName(session.getClassroom().getName())
                .sessionDate(session.getSessionDate())
                .startTime(session.getStartTime())
                .endTime(session.getEndTime())
                .status(session.getStatus())
                .qrToken(session.getQrToken())
                .qrExpiresAt(session.getQrExpiresAt())
                .totalStudents(total)
                .presentCount(present)
                .lateCount(late)
                .absentCount(absent)
                .excusedCount(excused)
                .createdAt(session.getCreatedAt())
                .build();
    }

    private SessionResponse mapToSessionResponseWithCounts(AttendanceSession session, Map<AttendanceStatus, Long> counts) {
        long present = counts.getOrDefault(AttendanceStatus.PRESENT, 0L);
        long late = counts.getOrDefault(AttendanceStatus.LATE, 0L);
        long absent = counts.getOrDefault(AttendanceStatus.ABSENT, 0L);
        long excused = counts.getOrDefault(AttendanceStatus.EXCUSED, 0L);
        long total = present + late + absent + excused;

        return SessionResponse.builder()
                .id(session.getId())
                .classroomId(session.getClassroom().getId())
                .classroomCode(session.getClassroom().getCode())
                .classroomName(session.getClassroom().getName())
                .sessionDate(session.getSessionDate())
                .startTime(session.getStartTime())
                .endTime(session.getEndTime())
                .status(session.getStatus())
                .qrToken(session.getQrToken())
                .qrExpiresAt(session.getQrExpiresAt())
                .totalStudents(total)
                .presentCount(present)
                .lateCount(late)
                .absentCount(absent)
                .excusedCount(excused)
                .createdAt(session.getCreatedAt())
                .build();
    }

    private AttendanceRecordResponse mapToRecordResponse(AttendanceRecord record) {
        return AttendanceRecordResponse.builder()
                .id(record.getId())
                .sessionId(record.getSession().getId())
                .studentId(record.getStudent().getId())
                .studentCode(record.getStudent().getStudentCode())
                .studentName(record.getStudent().getFullName())
                .status(record.getStatus())
                .checkInTime(record.getCheckInTime())
                .remarks(record.getRemarks())
                .updatedAt(record.getUpdatedAt())
                .build();
    }
}
