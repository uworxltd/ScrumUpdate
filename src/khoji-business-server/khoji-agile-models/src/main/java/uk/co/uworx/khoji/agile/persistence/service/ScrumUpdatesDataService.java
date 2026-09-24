package uk.co.uworx.khoji.agile.persistence.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.internal.model.SummaryGeneration;
import uk.co.uworx.khoji.agile.persistence.dto.response.ScrumUpdateResponse;
import uk.co.uworx.khoji.agile.persistence.model.ScrumUpdate;
import uk.co.uworx.khoji.agile.persistence.model.UserAccess;
import uk.co.uworx.khoji.agile.persistence.repository.ScrumUpdatesRepository;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class ScrumUpdatesDataService
{
    private final ScrumUpdatesRepository repository;

    @Autowired
    public ScrumUpdatesDataService(ScrumUpdatesRepository repository)
    {
        this.repository = repository;
    }
    @Autowired
    private UserAccessDataService userAccessDataService;

    public ScrumUpdateResponse createOrUpdateScrumUpdate(
        Principal principal,
        SummaryGeneration.ScrumUpdateSaveRequest dto
    ) {
        UserAccess userAccess = userAccessDataService
            .findByEmailAndInstanceId(principal.getName(), null)
            .orElseThrow(() -> new ServiceException(ServiceError.UA404));

        // Look up existing record by date
        List<ScrumUpdate> existing = repository.findByInstanceUser_InstanceIdAndUser_IdAndRequestedDateBetween(userAccess.getInstance().getId(), userAccess.getUser().getId(), dto.getDate(), dto.getDate());

        ScrumUpdate update;
        if (!existing.isEmpty()) {
            // Update existing record
            update = existing.getFirst();
            update.setBody(dto.getBody());
        } else {
            // Create new record
            update = new ScrumUpdate();
            update.setUniqueIdentifier(UUID.randomUUID().toString());
            update.setBody(dto.getBody());
            update.setUser(userAccess.getUser());
            update.setRequestedDate(dto.getDate());
            update.setUserName(userAccess.getInstanceUser().getFullName());
            update.setInstanceUser(userAccess.getInstanceUser());
        }

        ScrumUpdate saved = repository.save(update);
        return ScrumUpdateResponse.fromEntity(saved);
    }

    public List<ScrumUpdateResponse> getScrumUpdatesForInstanceBetween(Long instanceId, LocalDate start, LocalDate end) {
        return repository.findByInstanceUser_InstanceIdAndRequestedDateBetween(instanceId, start, end)
            .stream()
            .map(ScrumUpdateResponse::fromEntity)
            .toList();
    }

    public List<ScrumUpdateResponse> getScrumUpdatesForUserInInstanceBetween(
        Long instanceId, Long userId, LocalDate start, LocalDate end) {

        return repository.findByInstanceUser_InstanceIdAndUser_IdAndRequestedDateBetween(
                instanceId, userId, start, end)
            .stream()
            .map(ScrumUpdateResponse::fromEntity)
            .toList();
    }



}
