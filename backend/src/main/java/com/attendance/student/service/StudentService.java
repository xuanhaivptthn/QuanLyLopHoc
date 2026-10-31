package com.attendance.student.service;

import com.attendance.common.exception.BadRequestException;
import com.attendance.common.exception.ForbiddenException;
import com.attendance.common.exception.ResourceNotFoundException;
import com.attendance.common.security.UserPrincipal;
import com.attendance.organization.entity.Organization;
import com.attendance.organization.repository.OrganizationRepository;
import com.attendance.student.dto.BulkCreateStudentRequest;
import com.attendance.student.dto.BulkCreateStudentResponse;
import com.attendance.student.dto.BulkErrorItem;
import com.attendance.student.dto.CreateStudentRequest;
import com.attendance.student.dto.StudentResponse;
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
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;

    @Transactional
    public StudentResponse createStudent(UserPrincipal principal, CreateStudentRequest request) {
        String studentCode = request.getStudentCode().trim().toUpperCase();
        String email = request.getEmail().trim().toLowerCase();

        Organization org = null;
        User ownerTeacher = null;

        if (principal.getActiveOrganizationId() != null) {
            org = organizationRepository.findById(principal.getActiveOrganizationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Organization", "id", principal.getActiveOrganizationId()));

            if (studentRepository.existsByOrganizationIdAndStudentCode(org.getId(), studentCode)) {
                throw new BadRequestException("Student code '" + studentCode + "' already exists in this center.");
            }
        } else {
            ownerTeacher = userRepository.findById(principal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", principal.getId()));

            if (studentRepository.existsByOwnerTeacherIdAndOrganizationIsNullAndStudentCode(ownerTeacher.getId(), studentCode)) {
                throw new BadRequestException("Student code '" + studentCode + "' already exists in your roster.");
            }
        }

        User studentUser = userRepository.findByEmail(email).orElse(null);

        Student student = Student.builder()
                .studentCode(studentCode)
                .fullName(request.getFullName().trim())
                .email(email)
                .phone(request.getPhone() != null ? request.getPhone().trim() : null)
                .avatarUrl(request.getAvatarUrl())
                .organization(org)
                .ownerTeacher(ownerTeacher)
                .user(studentUser)
                .build();

        student = studentRepository.save(student);
        log.info("Student {} created by user {}", student.getStudentCode(), principal.getEmail());

        return mapToResponse(student);
    }

    @Transactional
    public BulkCreateStudentResponse bulkCreateStudents(UserPrincipal principal, BulkCreateStudentRequest request) {
        List<CreateStudentRequest> list = request.getStudents();
        if (list == null || list.isEmpty()) {
            return BulkCreateStudentResponse.builder()
                    .totalRequested(0)
                    .successCount(0)
                    .skippedCount(0)
                    .createdStudents(List.of())
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

        List<Student> toSave = new ArrayList<>();
        List<BulkErrorItem> errors = new ArrayList<>();
        Set<String> seenCodesInBatch = new HashSet<>();

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
                        .message("Mã sinh viên trùng lặp trong danh sách nhập")
                        .build());
                continue;
            }
            seenCodesInBatch.add(code);

            boolean exists = (org != null)
                    ? studentRepository.existsByOrganizationIdAndStudentCode(org.getId(), code)
                    : studentRepository.existsByOwnerTeacherIdAndOrganizationIsNullAndStudentCode(ownerTeacher.getId(), code);

            if (exists) {
                errors.add(BulkErrorItem.builder()
                        .row(rowNumber)
                        .studentCode(code)
                        .message("Mã sinh viên '" + code + "' đã tồn tại trong hệ thống")
                        .build());
                continue;
            }

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

            Student student = Student.builder()
                    .studentCode(code)
                    .fullName(fullName)
                    .email(email)
                    .phone(item.getPhone() != null && !item.getPhone().trim().isEmpty() ? item.getPhone().trim() : null)
                    .avatarUrl(item.getAvatarUrl())
                    .organization(org)
                    .ownerTeacher(ownerTeacher)
                    .user(studentUser)
                    .build();

            toSave.add(student);
        }

        List<Student> saved = studentRepository.saveAll(toSave);
        log.info("Bulk created {}/{} students for user {}", saved.size(), list.size(), principal.getEmail());

        List<StudentResponse> studentResponses = saved.stream()
                .map(this::mapToResponse)
                .toList();

        return BulkCreateStudentResponse.builder()
                .totalRequested(list.size())
                .successCount(saved.size())
                .skippedCount(errors.size())
                .createdStudents(studentResponses)
                .errors(errors)
                .build();
    }

    @Transactional(readOnly = true)
    public List<StudentResponse> getStudents(UserPrincipal principal) {
        List<Student> students;

        if (principal.getActiveOrganizationId() != null) {
            students = studentRepository.findAllByOrganizationId(principal.getActiveOrganizationId());
        } else {
            students = studentRepository.findAllByOwnerTeacherIdAndOrganizationIsNull(principal.getId());
        }

        return students.stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public StudentResponse getStudentById(UserPrincipal principal, UUID id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));

        assertAccess(principal, student);

        return mapToResponse(student);
    }

    private void assertAccess(UserPrincipal principal, Student student) {
        if (principal.getRole() == Role.SUPER_ADMIN) {
            return;
        }

        if (student.getOrganization() != null) {
            if (student.getOrganization().getId().equals(principal.getActiveOrganizationId())) {
                return;
            }
        } else if (student.getOwnerTeacher() != null) {
            if (student.getOwnerTeacher().getId().equals(principal.getId())) {
                return;
            }
        }

        throw new ForbiddenException("You do not have access to this student profile.");
    }

    private StudentResponse mapToResponse(Student student) {
        return StudentResponse.builder()
                .id(student.getId())
                .studentCode(student.getStudentCode())
                .fullName(student.getFullName())
                .email(student.getEmail())
                .phone(student.getPhone())
                .avatarUrl(student.getAvatarUrl())
                .organizationId(student.getOrganization() != null ? student.getOrganization().getId() : null)
                .ownerTeacherId(student.getOwnerTeacher() != null ? student.getOwnerTeacher().getId() : null)
                .userId(student.getUser() != null ? student.getUser().getId() : null)
                .createdAt(student.getCreatedAt())
                .build();
    }
}
