package uk.co.uworx.khoji.agile.persistence.dto.response;

import lombok.Data;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;
import uk.co.uworx.khoji.agile.persistence.model.ScrumUpdate;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Data
public class ScrumUpdateResponse
{
    // Scrum update info
    private Long id;
    private String uniqueIdentifier;
    private LocalDate requestedDate;
    private String body;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    // Basic user info
    private Long userId;
    private String userEmail;
    private String userFullName;
    private String userImageUrl;

    // Instance info
    private Long instanceId;
    private String instanceName;
    private String instanceImageUrl;
    private String platform;

    // Role & access level
    private Long roleId;
    private String roleCode;
    private String roleName;

    private Long accessLevelId;
    private String accessLevelCode;
    private String accessLevelDescription;

    public static ScrumUpdateResponse fromEntity(ScrumUpdate update) {
        ScrumUpdateResponse dto = new ScrumUpdateResponse();
        dto.setId(update.getId());
        dto.setUniqueIdentifier(update.getUniqueIdentifier());
        dto.setRequestedDate(update.getRequestedDate());
        dto.setBody(update.getBody());
        dto.setCreatedAt(update.getCreatedAt());
        dto.setUpdatedAt(update.getUpdatedAt());

        // User
        if (update.getUser() != null) {
            dto.setUserId(update.getUser().getId());
            dto.setUserEmail(update.getUser().getEmail());
            dto.setUserFullName(update.getUser().getFullName());
            dto.setUserImageUrl(update.getUser().getImageUrl());
        }

        // InstanceUser → Instance
        InstanceUser iu = update.getInstanceUser();
        if (iu != null && iu.getInstance() != null) {
            dto.setInstanceId(iu.getInstance().getId());
            dto.setInstanceName(iu.getInstance().getInstanceName());
            dto.setInstanceImageUrl(iu.getInstance().getInstanceImageUrl());
            dto.setPlatform(iu.getInstance().getPlatform());
        }

        // Role
        if (iu != null && iu.getRole() != null) {
            dto.setRoleId(iu.getRole().getId());
            dto.setRoleCode(iu.getRole().getCode());
            dto.setRoleName(iu.getRole().getName());
        }

        // AccessLevel
        if (iu != null && iu.getAccessLevel() != null) {
            dto.setAccessLevelId(iu.getAccessLevel().getId());
            dto.setAccessLevelCode(iu.getAccessLevel().getLevelCode());
            dto.setAccessLevelDescription(iu.getAccessLevel().getDescription());
        }

        return dto;
    }

}
