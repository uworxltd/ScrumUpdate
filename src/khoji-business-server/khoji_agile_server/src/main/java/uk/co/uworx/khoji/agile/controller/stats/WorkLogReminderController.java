/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.controller.stats;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uk.co.uworx.khoji.agile.request.WorkLogReminderRequest;
import uk.co.uworx.khoji.agile.service.WorkLogReminderService;

import jakarta.validation.Valid;

@CrossOrigin
@RestController
public class WorkLogReminderController {
    @Autowired
    private WorkLogReminderService workLogReminderService;

    @PostMapping(value = "/remindWorkLog", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> remindWorkLog(
            @Valid
            @RequestBody
            WorkLogReminderRequest workLogReminderRequest
    ) throws Exception
    {

        workLogReminderService.processReminder(workLogReminderRequest);

        return new ResponseEntity<>(HttpStatus.OK);
    }
}
