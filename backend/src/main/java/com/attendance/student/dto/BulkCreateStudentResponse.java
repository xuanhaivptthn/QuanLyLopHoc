package com.attendance.student.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkCreateStudentResponse {
    private int totalRequested;
    private int successCount;
    private int skippedCount;
    private List<StudentResponse> createdStudents;
    private List<BulkErrorItem> errors;
}
