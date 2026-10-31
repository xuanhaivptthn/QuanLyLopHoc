package com.attendance;

import com.attendance.attendance.dto.CreateSessionRequest;
import com.attendance.attendance.dto.QrTokenResponse;
import com.attendance.attendance.dto.SessionResponse;
import com.attendance.auth.dto.AuthResponse;
import com.attendance.auth.dto.RegisterCenterRequest;
import com.attendance.auth.dto.RegisterSoloTeacherRequest;
import com.attendance.classroom.dto.BulkEnrollStudentsRequest;
import com.attendance.classroom.dto.BulkEnrollmentResponse;
import com.attendance.classroom.dto.BulkImportToClassroomResponse;
import com.attendance.classroom.dto.ClassroomResponse;
import com.attendance.classroom.dto.CreateClassroomRequest;
import com.attendance.classroom.dto.EnrollStudentRequest;
import com.attendance.student.dto.BulkCreateStudentRequest;
import com.attendance.student.dto.BulkCreateStudentResponse;
import com.attendance.student.dto.CreateStudentRequest;
import com.attendance.student.dto.StudentResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
class PlatformIntegrationTest {

    @Autowired
    private WebApplicationContext context;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();
    }

    @Test
    @DisplayName("Should successfully register a solo teacher, create class, student, session, and dynamic QR")
    void shouldExecuteFullSoloTeacherLifecycle() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 6);

        // 1. Register solo teacher
        RegisterSoloTeacherRequest teacherReq = new RegisterSoloTeacherRequest();
        teacherReq.setEmail("teacher_" + suffix + "@example.com");
        teacherReq.setPassword("Password123!");
        teacherReq.setFullName("Thầy Nam Dạy Toán");

        MvcResult regResult = mockMvc.perform(post("/auth/register-teacher")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(teacherReq)))
                .andExpect(status().isCreated())
                .andReturn();

        AuthResponse auth = objectMapper.readValue(regResult.getResponse().getContentAsString(), AuthResponse.class);
        assertThat(auth.getToken()).isNotBlank();
        assertThat(auth.getRole().name()).isEqualTo("TEACHER");
        assertThat(auth.getActiveOrganizationId()).isNull();

        String bearerToken = "Bearer " + auth.getToken();

        // 2. Create personal classroom
        CreateClassroomRequest classReq = new CreateClassroomRequest();
        classReq.setCode("MATH-" + suffix.toUpperCase());
        classReq.setName("Toán Nâng Cao 10");
        classReq.setSemester("2024.1");

        MvcResult classResult = mockMvc.perform(post("/classrooms")
                        .header("Authorization", bearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(classReq)))
                .andExpect(status().isCreated())
                .andReturn();

        ClassroomResponse classroom = objectMapper.readValue(classResult.getResponse().getContentAsString(), ClassroomResponse.class);
        assertThat(classroom.getCode()).isEqualTo(classReq.getCode());
        assertThat(classroom.getOrganizationId()).isNull();

        // 3. Create student
        CreateStudentRequest studentReq = new CreateStudentRequest();
        studentReq.setStudentCode("SV-" + suffix.toUpperCase());
        studentReq.setFullName("Nguyễn Văn An");
        studentReq.setEmail("student_" + suffix + "@example.com");
        studentReq.setPhone("0901234567");

        MvcResult studentResult = mockMvc.perform(post("/students")
                        .header("Authorization", bearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(studentReq)))
                .andExpect(status().isCreated())
                .andReturn();

        StudentResponse student = objectMapper.readValue(studentResult.getResponse().getContentAsString(), StudentResponse.class);
        assertThat(student.getStudentCode()).isEqualTo(studentReq.getStudentCode());

        // 4. Enroll student into classroom
        EnrollStudentRequest enrollReq = new EnrollStudentRequest();
        enrollReq.setStudentId(student.getId());

        mockMvc.perform(post("/classrooms/" + classroom.getId() + "/students")
                        .header("Authorization", bearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(enrollReq)))
                .andExpect(status().isCreated());

        // 5. Create attendance session
        CreateSessionRequest sessionReq = new CreateSessionRequest();
        sessionReq.setSessionDate(LocalDate.now());
        sessionReq.setStartTime(LocalTime.of(8, 0));
        sessionReq.setEndTime(LocalTime.of(10, 0));

        MvcResult sessionResult = mockMvc.perform(post("/classrooms/" + classroom.getId() + "/sessions")
                        .header("Authorization", bearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sessionReq)))
                .andExpect(status().isCreated())
                .andReturn();

        SessionResponse session = objectMapper.readValue(sessionResult.getResponse().getContentAsString(), SessionResponse.class);
        assertThat(session.getTotalStudents()).isEqualTo(1);
        assertThat(session.getAbsentCount()).isEqualTo(1);

        // 6. Generate dynamic QR code token
        MvcResult qrResult = mockMvc.perform(post("/sessions/" + session.getId() + "/open-qr")
                        .header("Authorization", bearerToken))
                .andExpect(status().isOk())
                .andReturn();

        QrTokenResponse qr = objectMapper.readValue(qrResult.getResponse().getContentAsString(), QrTokenResponse.class);
        assertThat(qr.getQrToken()).isNotBlank();
        assertThat(qr.getValiditySeconds()).isEqualTo(30);
    }

    @Test
    @DisplayName("Should successfully register a teaching center with administrator account")
    void shouldRegisterTeachingCenter() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 6);

        RegisterCenterRequest centerReq = new RegisterCenterRequest();
        centerReq.setCenterName("IELTS Fighter Academy " + suffix);
        centerReq.setCenterCode("center-" + suffix.toLowerCase());
        centerReq.setContactEmail("contact_" + suffix + "@ieltsfighter.vn");
        centerReq.setContactPhone("0241234567");
        centerReq.setAdminEmail("admin_" + suffix + "@ieltsfighter.vn");
        centerReq.setAdminPassword("AdminPass123!");
        centerReq.setAdminFullName("Giám Đốc Trung Tâm");

        MvcResult result = mockMvc.perform(post("/auth/register-center")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(centerReq)))
                .andExpect(status().isCreated())
                .andReturn();

        AuthResponse auth = objectMapper.readValue(result.getResponse().getContentAsString(), AuthResponse.class);
        assertThat(auth.getToken()).isNotBlank();
        assertThat(auth.getRole().name()).isEqualTo("CENTER_ADMIN");
        assertThat(auth.getActiveOrganizationId()).isNotNull();
        assertThat(auth.getActiveOrganizationName()).isEqualTo(centerReq.getCenterName());
    }

    @Test
    @DisplayName("Should test bulk student creation, bulk enrollment, and direct classroom roster import")
    void shouldExecuteBulkOperations() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 6);

        // 1. Register solo teacher
        RegisterSoloTeacherRequest teacherReq = new RegisterSoloTeacherRequest();
        teacherReq.setEmail("bulk_teacher_" + suffix + "@example.com");
        teacherReq.setPassword("Password123!");
        teacherReq.setFullName("Thầy Hải Dạy Lý");

        MvcResult regResult = mockMvc.perform(post("/auth/register-teacher")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(teacherReq)))
                .andExpect(status().isCreated())
                .andReturn();

        AuthResponse auth = objectMapper.readValue(regResult.getResponse().getContentAsString(), AuthResponse.class);
        String bearerToken = "Bearer " + auth.getToken();

        // 2. Create classroom
        CreateClassroomRequest classReq = new CreateClassroomRequest();
        classReq.setCode("PHYS-" + suffix.toUpperCase());
        classReq.setName("Vật Lý Đại Cương 1");
        classReq.setSemester("2024.1");

        MvcResult classResult = mockMvc.perform(post("/classrooms")
                        .header("Authorization", bearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(classReq)))
                .andExpect(status().isCreated())
                .andReturn();

        ClassroomResponse classroom = objectMapper.readValue(classResult.getResponse().getContentAsString(), ClassroomResponse.class);

        // 3. Test bulk student creation (3 students: 2 valid, 1 duplicate MSSV)
        CreateStudentRequest s1 = new CreateStudentRequest();
        s1.setStudentCode("STU1-" + suffix.toUpperCase());
        s1.setFullName("Lê Văn Một");
        s1.setEmail("stu1_" + suffix + "@example.com");

        CreateStudentRequest s2 = new CreateStudentRequest();
        s2.setStudentCode("STU2-" + suffix.toUpperCase());
        s2.setFullName("Trần Thị Hai");
        s2.setEmail("stu2_" + suffix + "@example.com");

        CreateStudentRequest s3Dup = new CreateStudentRequest();
        s3Dup.setStudentCode("STU1-" + suffix.toUpperCase()); // Duplicate
        s3Dup.setFullName("Lê Văn Một Trùng Lặp");
        s3Dup.setEmail("dup_" + suffix + "@example.com");

        BulkCreateStudentRequest bulkReq = new BulkCreateStudentRequest(java.util.List.of(s1, s2, s3Dup));

        MvcResult bulkResult = mockMvc.perform(post("/students/bulk")
                        .header("Authorization", bearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bulkReq)))
                .andExpect(status().isCreated())
                .andReturn();

        BulkCreateStudentResponse bulkRes = objectMapper.readValue(bulkResult.getResponse().getContentAsString(), BulkCreateStudentResponse.class);
        assertThat(bulkRes.getTotalRequested()).isEqualTo(3);
        assertThat(bulkRes.getSuccessCount()).isEqualTo(2);
        assertThat(bulkRes.getSkippedCount()).isEqualTo(1);
        assertThat(bulkRes.getCreatedStudents()).hasSize(2);
        assertThat(bulkRes.getErrors()).hasSize(1);

        UUID stu1Id = bulkRes.getCreatedStudents().get(0).getId();
        UUID stu2Id = bulkRes.getCreatedStudents().get(1).getId();

        // 4. Test bulk enrollment
        BulkEnrollStudentsRequest enrollReq = new BulkEnrollStudentsRequest(java.util.List.of(stu1Id, stu2Id));
        MvcResult enrollResult = mockMvc.perform(post("/classrooms/" + classroom.getId() + "/students/bulk")
                        .header("Authorization", bearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(enrollReq)))
                .andExpect(status().isCreated())
                .andReturn();

        BulkEnrollmentResponse enrollRes = objectMapper.readValue(enrollResult.getResponse().getContentAsString(), BulkEnrollmentResponse.class);
        assertThat(enrollRes.getTotalRequested()).isEqualTo(2);
        assertThat(enrollRes.getEnrolledCount()).isEqualTo(2);
        assertThat(enrollRes.getSkippedCount()).isEqualTo(0);

        // Re-enrolling should be idempotent and skipped
        MvcResult reEnrollResult = mockMvc.perform(post("/classrooms/" + classroom.getId() + "/students/bulk")
                        .header("Authorization", bearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(enrollReq)))
                .andExpect(status().isCreated())
                .andReturn();
        BulkEnrollmentResponse reEnrollRes = objectMapper.readValue(reEnrollResult.getResponse().getContentAsString(), BulkEnrollmentResponse.class);
        assertThat(reEnrollRes.getEnrolledCount()).isEqualTo(0);
        assertThat(reEnrollRes.getSkippedCount()).isEqualTo(2);

        // 5. Test direct classroom roster import (bulk-import)
        CreateStudentRequest s4 = new CreateStudentRequest();
        s4.setStudentCode("STU4-" + suffix.toUpperCase());
        s4.setFullName("Phạm Văn Bốn");
        s4.setEmail("stu4_" + suffix + "@example.com");

        // s1 already exists in directory and is enrolled -> should be skipped for enrollment, no error
        CreateStudentRequest s1Again = new CreateStudentRequest();
        s1Again.setStudentCode("STU1-" + suffix.toUpperCase());
        s1Again.setFullName("Lê Văn Một");
        s1Again.setEmail("stu1_" + suffix + "@example.com");

        BulkCreateStudentRequest importReq = new BulkCreateStudentRequest(java.util.List.of(s4, s1Again));

        MvcResult importResult = mockMvc.perform(post("/classrooms/" + classroom.getId() + "/students/bulk-import")
                        .header("Authorization", bearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(importReq)))
                .andExpect(status().isCreated())
                .andReturn();

        BulkImportToClassroomResponse importRes = objectMapper.readValue(importResult.getResponse().getContentAsString(), BulkImportToClassroomResponse.class);
        assertThat(importRes.getTotalRequested()).isEqualTo(2);
        assertThat(importRes.getCreatedStudentsCount()).isEqualTo(1);
        assertThat(importRes.getEnrolledCount()).isEqualTo(1);
        assertThat(importRes.getSkippedCount()).isEqualTo(1);
    }
}
