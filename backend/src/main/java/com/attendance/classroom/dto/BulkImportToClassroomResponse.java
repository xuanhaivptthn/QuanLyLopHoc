package com.attendance.classroom.dto;

import com.attendance.student.dto.BulkErrorItem;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkImportToClassroomResponse {
    private int totalRequested;
    private int createdStudentsCount;
    private int enrolledCount;
    private int skippedCount;
    private List<BulkErrorItem> errors;
}
