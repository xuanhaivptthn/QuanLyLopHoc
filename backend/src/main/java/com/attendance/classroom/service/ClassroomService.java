package com.attendance.classroom.service;

import com.attendance.classroom.dto.BulkEnrollStudentsRequest;
import com.attendance.classroom.dto.BulkEnrollmentResponse;
import com.attendance.classroom.dto.BulkImportToClassroomResponse;
import com.attendance.classroom.dto.ClassroomResponse;
import com.attendance.classroom.dto.CreateClassroomRequest;
import com.attendance.classroom.dto.EnrollStudentRequest;
import com.attendance.classroom.dto.EnrollmentResponse;
import com.attendance.classroom.entity.Classroom;
import com.attendance.classroom.entity.Enrollment;
import com.attendance.classroom.repository.ClassroomRepository;
import com.attendance.classroom.repository.EnrollmentRepository;
import com.attendance.common.exception.BadRequestException;
import com.attendance.common.exception.ForbiddenException;
import com.attendance.common.exception.ResourceNotFoundException;
import com.attendance.common.security.UserPrincipal;
import com.attendance.organization.entity.Organization;
import com.attendance.organization.repository.OrganizationRepository;
import com.attendance.student.dto.BulkCreateStudentRequest;
import com.attendance.student.dto.BulkErrorItem;
import com.attendance.student.dto.CreateStudentRequest;
import com.attendance.student.entity.Student;
import com.attendance.student.repository.StudentRepository;
import com.attendance.user.entity.Role;
import com.attendance.user.entity.User;
import com.attendance.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ClassroomService {

    private final ClassroomRepository classroomRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final OrganizationRepository organizationRepository;

    @Transactional
    public ClassroomResponse createClassroom(UserPrincipal principal, CreateClassroomRequest request) {
        String code = request.getCode().trim().toUpperCase();
        User teacher;
        Organization org = null;

        if (principal.getRole() == Role.CENTER_ADMIN) {
            if (principal.getActiveOrganizationId() == null) {
                throw new BadRequestException("Administrator must belong to an organization to create classes.");
            }
            org = organizationRepository.findById(principal.getActiveOrganizationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Organization", "id", principal.getActiveOrganizationId()));

            if (classroomRepository.existsByOrganizationIdAndCode(org.getId(), code)) {
                throw new BadRequestException("Classroom with code '" + code + "' already exists in this center.");
            }

            UUID targetTeacherId = request.getTeacherId() != null ? request.getTeacherId() : principal.getId();
            teacher = userRepository.findById(targetTeacherId)
                    .orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", targetTeacherId));
        } else {
            if (principal.getActiveOrganizationId() != null) {
                org = organizationRepository.findById(principal.getActiveOrganizationId()).orElse(null);
            }

            if (org != null) {
                if (classroomRepository.existsByOrganizationIdAndCode(org.getId(), code)) {
                    throw new BadRequestException("Classroom with code '" + code + "' already exists in this center.");
                }
            } else {
                if (classroomRepository.existsByTeacherIdAndOrganizationIsNullAndCode(principal.getId(), code)) {
                    throw new BadRequestException("You already have a personal classroom with code: " + code);
                }
            }

            teacher = userRepository.findById(principal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", principal.getId()));
        }

        Classroom classroom = Classroom.builder()
                .code(code)
                .name(request.getName().trim())
                .semester(request.getSemester().trim())
                .organization(org)
                .teacher(teacher)
                .build();

        classroom = classroomRepository.save(classroom);
        log.info("Classroom '{}' created by user {}", classroom.getCode(), principal.getEmail());

        return mapToResponse(classroom, 0);
    }

    @Transactional(readOnly = true)
    public List<ClassroomResponse> getClassrooms(UserPrincipal principal) {
        List<Classroom> classrooms;

        if (principal.getRole() == Role.CENTER_ADMIN && principal.getActiveOrganizationId() != null) {
            classrooms = classroomRepository.findAllByOrganizationIdWithDetails(principal.getActiveOrganizationId());
        } else if (principal.getActiveOrganizationId() != null) {
            classrooms = classroomRepository.findAllByOrganizationIdAndTeacherIdWithDetails(
                    principal.getActiveOrganizationId(), principal.getId());
        } else {
            classrooms = classroomRepository.findAllSoloByTeacherIdWithDetails(principal.getId());
        }

        if (classrooms.isEmpty()) {
            return List.of();
        }

        List<UUID> classroomIds = classrooms.stream().map(Classroom::getId).toList();
        Map<UUID, Long> countMap = enrollmentRepository.countEnrollmentsByClassroomIds(classroomIds).stream()
                .collect(Collectors.toMap(
                        row -> (UUID) row[0],
                        row -> ((Number) row[1]).longValue()
                ));

        return classrooms.stream()
                .map(c -> mapToResponse(c, countMap.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public ClassroomResponse getClassroomById(UserPrincipal principal, UUID id) {
        Classroom classroom = classroomRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom", "id", id));

        assertAccess(principal, classroom);

        long total = enrollmentRepository.countByClassroomId(classroom.getId());
        return mapToResponse(classroom, total);
    }

    @Transactional
    public EnrollmentResponse enrollStudent(UserPrincipal principal, UUID classroomId, EnrollStudentRequest request) {
        Classroom classroom = classroomRepository.findByIdWithDetails(classroomId)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom", "id", classroomId));

        assertAccess(principal, classroom);

        Student student = studentRepository.findById(request.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", request.getStudentId()));

        if (enrollmentRepository.existsByClassroomIdAndStudentId(classroomId, student.getId())) {
            throw new BadRequestException("Student is already enrolled in this classroom.");
        }

        Enrollment enrollment = Enrollment.builder()
                .classroom(classroom)
                .student(student)
                .build();

        enrollment = enrollmentRepository.save(enrollment);
        log.info("Enrolled student {} into classroom {}", student.getStudentCode(), classroom.getCode());

        return mapToEnrollmentResponse(enrollment);
    }

    @Transactional
    public BulkEnrollmentResponse bulkEnrollStudents(UserPrincipal principal, UUID classroomId, BulkEnrollStudentsRequest request) {
        Classroom classroom = classroomRepository.findByIdWithDetails(classroomId)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom", "id", classroomId));

        assertAccess(principal, classroom);

        List<UUID> requestedIds = request.getStudentIds();
        if (requestedIds == null || requestedIds.isEmpty()) {
            return BulkEnrollmentResponse.builder()
                    .totalRequested(0)
                    .enrolledCount(0)
                    .skippedCount(0)
                    .enrollments(List.of())
                    .build();
        }

        List<UUID> uniqueIds = requestedIds.stream().distinct().toList();
        List<Student> students = studentRepository.findAllById(uniqueIds);

        List<Enrollment> existingEnrollments = enrollmentRepository.findAllByClassroomIdWithStudent(classroomId);
        Set<UUID> existingStudentIds = existingEnrollments.stream()
                .map(e -> e.getStudent().getId())
                .collect(Collectors.toSet());

        List<Enrollment> newEnrollments = new ArrayList<>();
        int skipped = 0;

        for (Student st : students) {
            if (existingStudentIds.contains(st.getId())) {
                skipped++;
                continue;
            }
            newEnrollments.add(Enrollment.builder()
                    .classroom(classroom)
                    .student(st)
                    .build());
        }

        skipped += (uniqueIds.size() - students.size());

        List<Enrollment> saved = enrollmentRepository.saveAll(newEnrollments);
        log.info("Bulk enrolled {} students into classroom {}", saved.size(), classroom.getCode());

        return BulkEnrollmentResponse.builder()
                .totalRequested(uniqueIds.size())
                .enrolledCount(saved.size())
                .skippedCount(skipped)
                .enrollments(saved.stream().map(this::mapToEnrollmentResponse).toList())
                .build();
    }

    @Transactional
    public BulkImportToClassroomResponse bulkImportToClassroom(UserPrincipal principal, UUID classroomId, BulkCreateStudentRequest request) {
        Classroom classroom = classroomRepository.findByIdWithDetails(classroomId)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom", "id", classroomId));

        assertAccess(principal, classroom);

        List<CreateStudentRequest> list = request.getStudents();
        if (list == null || list.isEmpty()) {
            return BulkImportToClassroomResponse.builder()
                    .totalRequested(0)
                    .createdStudentsCount(0)
                    .enrolledCount(0)
                    .skippedCount(0)
                    .errors(List.of())
                    .build();
        }

        Organization org = null;
        User ownerTeacher = null;
        if (principal.getActiveOrganizationId() != null) {
            org = organizationRepository.findById(principal.getActiveOrganizationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Organization", "id", principal.getActiveOrganizationId()));
        } else {
            ownerTeacher = userRepository.findById(principal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", principal.getId()));
        }

        List<Enrollment> existingEnrollments = enrollmentRepository.findAllByClassroomIdWithStudent(classroomId);
        Set<UUID> existingEnrolledStudentIds = existingEnrollments.stream()
                .map(e -> e.getStudent().getId())
                .collect(Collectors.toSet());

        List<BulkErrorItem> errors = new ArrayList<>();
        Set<String> seenCodesInBatch = new HashSet<>();
        List<Student> studentsToEnroll = new ArrayList<>();
        int createdCount = 0;
        int skippedCount = 0;

        for (int i = 0; i < list.size(); i++) {
            CreateStudentRequest item = list.get(i);
            int rowNumber = i + 1;

            if (item.getStudentCode() == null || item.getStudentCode().trim().isEmpty()) {
                errors.add(BulkErrorItem.builder()
                        .row(rowNumber)
                        .studentCode(null)
                        .message("Mã sinh viên không được để trống")
                        .build());
                continue;
            }

            String code = item.getStudentCode().trim().toUpperCase();
            if (seenCodesInBatch.contains(code)) {
                errors.add(BulkErrorItem.builder()
                        .row(rowNumber)
                        .studentCode(code)
                        .message("Mã sinh viên trùng lặp trong tệp nhập")
                        .build());
                continue;
            }
            seenCodesInBatch.add(code);

            Optional<Student> existingStudent = (org != null)
                    ? studentRepository.findByOrganizationIdAndStudentCode(org.getId(), code)
                    : studentRepository.findByOwnerTeacherIdAndOrganizationIsNullAndStudentCode(ownerTeacher.getId(), code);

            Student student;
            if (existingStudent.isPresent()) {
                student = existingStudent.get();
            } else {
                String fullName = item.getFullName() != null ? item.getFullName().trim() : "";
                if (fullName.isEmpty()) {
                    errors.add(BulkErrorItem.builder()
                            .row(rowNumber)
                            .studentCode(code)
                            .message("Họ và tên không được để trống")
                            .build());
                    continue;
                }

                String email = item.getEmail() != null ? item.getEmail().trim().toLowerCase() : "";
                if (email.isEmpty()) {
                    errors.add(BulkErrorItem.builder()
                            .row(rowNumber)
                            .studentCode(code)
                            .message("Email không được để trống")
                            .build());
                    continue;
                }

                User studentUser = userRepository.findByEmail(email).orElse(null);

                student = Student.builder()
                        .studentCode(code)
                        .fullName(fullName)
                        .email(email)
                        .phone(item.getPhone() != null && !item.getPhone().trim().isEmpty() ? item.getPhone().trim() : null)
                        .avatarUrl(item.getAvatarUrl())
                        .organization(org)
                        .ownerTeacher(ownerTeacher)
                        .user(studentUser)
                        .build();

                student = studentRepository.save(student);
                createdCount++;
            }

            if (existingEnrolledStudentIds.contains(student.getId())) {
                skippedCount++;
            } else {
                studentsToEnroll.add(student);
                existingEnrolledStudentIds.add(student.getId());
            }
        }

        List<Enrollment> enrollmentsToSave = studentsToEnroll.stream()
                .map(st -> Enrollment.builder().classroom(classroom).student(st).build())
                .toList();

        List<Enrollment> savedEnrollments = enrollmentRepository.saveAll(enrollmentsToSave);
        log.info("Bulk imported to classroom {}: {} new students, {} enrolled, {} skipped",
                classroom.getCode(), createdCount, savedEnrollments.size(), skippedCount);

        return BulkImportToClassroomResponse.builder()
                .totalRequested(list.size())
                .createdStudentsCount(createdCount)
                .enrolledCount(savedEnrollments.size())
                .skippedCount(skippedCount)
                .errors(errors)
                .build();
    }

    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getClassroomStudents(UserPrincipal principal, UUID classroomId) {
        Classroom classroom = classroomRepository.findByIdWithDetails(classroomId)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom", "id", classroomId));

        assertAccess(principal, classroom);

        return enrollmentRepository.findAllByClassroomIdWithStudent(classroomId).stream()
                .map(this::mapToEnrollmentResponse)
                .toList();
    }

    @Transactional
    public void removeStudent(UserPrincipal principal, UUID classroomId, UUID studentId) {
        Classroom classroom = classroomRepository.findByIdWithDetails(classroomId)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom", "id", classroomId));

        assertAccess(principal, classroom);

        enrollmentRepository.deleteByClassroomIdAndStudentId(classroomId, studentId);
        log.info("Removed student {} from classroom {}", studentId, classroom.getCode());
    }

    private void assertAccess(UserPrincipal principal, Classroom classroom) {
        if (principal.getRole() == Role.SUPER_ADMIN) {
            return;
        }

        if (classroom.getOrganization() != null) {
            UUID orgId = classroom.getOrganization().getId();
            if (orgId.equals(principal.getActiveOrganizationId())) {
                if (principal.getRole() == Role.CENTER_ADMIN) return;
                if (classroom.getTeacher().getId().equals(principal.getId())) return;
            }
        } else {
            if (classroom.getTeacher().getId().equals(principal.getId())) return;
        }

        throw new ForbiddenException("You do not have permission to access this classroom.");
    }

    private ClassroomResponse mapToResponse(Classroom c, long totalStudents) {
        return ClassroomResponse.builder()
                .id(c.getId())
                .code(c.getCode())
                .name(c.getName())
                .semester(c.getSemester())
                .teacherId(c.getTeacher().getId())
                .teacherName(c.getTeacher().getFullName())
                .organizationId(c.getOrganization() != null ? c.getOrganization().getId() : null)
                .organizationName(c.getOrganization() != null ? c.getOrganization().getName() : null)
                .totalStudents(totalStudents)
                .createdAt(c.getCreatedAt())
                .build();
    }

    private EnrollmentResponse mapToEnrollmentResponse(Enrollment e) {
        return EnrollmentResponse.builder()
                .enrollmentId(e.getId())
                .classroomId(e.getClassroom().getId())
                .studentId(e.getStudent().getId())
                .studentCode(e.getStudent().getStudentCode())
                .fullName(e.getStudent().getFullName())
                .email(e.getStudent().getEmail())
                .phone(e.getStudent().getPhone())
                .enrolledAt(e.getEnrolledAt())
                .build();
    }
}
