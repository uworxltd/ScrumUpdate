package uk.co.uworx.khoji.agile.controller.stats;

import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.internal.helper.SecurityAccessLevel;
import uk.co.uworx.khoji.agile.internal.model.SummaryGeneration;
import uk.co.uworx.khoji.agile.persistence.dto.response.ScrumUpdateResponse;
import uk.co.uworx.khoji.agile.persistence.service.ScrumUpdatesDataService;
import uk.co.uworx.khoji.security.annotations.HasAccessToInstanceWithPrivilege;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/scrum")
@Log4j2
public class ScrumUpdateController
{
    @Autowired
    private ScrumUpdatesDataService scrumUpdatesDataService;

    @GetMapping(
        value = "{instanceId}/users/{userId}/gather",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<List<ScrumUpdateResponse>> gatherScrumUpdatesForInstance(
        @PathVariable Long instanceId,
        @PathVariable Long userId,
        @RequestParam LocalDate startDate,
        @RequestParam LocalDate endDate
    )
    {
        return new ResponseEntity<>(
            scrumUpdatesDataService.getScrumUpdatesForUserInInstanceBetween(instanceId, userId, startDate, endDate),
            HttpStatus.OK
        );
    }

    @PostMapping(
        value = "save",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<ScrumUpdateResponse> upsertScrumUpdates(
        @RequestBody SummaryGeneration.ScrumUpdateSaveRequest request,
        Principal principal
    )
    {
        return new ResponseEntity<>(
            scrumUpdatesDataService.createOrUpdateScrumUpdate(principal, request),
            HttpStatus.CREATED
        );
    }

    @GetMapping(
        value = "{instanceId}/gather",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    @HasAccessToInstanceWithPrivilege(privileges = {SecurityAccessLevel.ADMIN})
    public ResponseEntity<List<ScrumUpdateResponse>> gatherScrumUpdatesForInstance(
        @PathVariable Long instanceId,
        @RequestParam LocalDate startDate,
        @RequestParam LocalDate endDate
    )
    {
        return new ResponseEntity<>(
            scrumUpdatesDataService.getScrumUpdatesForInstanceBetween(instanceId, startDate, endDate),
            HttpStatus.OK
        );
    }
}
