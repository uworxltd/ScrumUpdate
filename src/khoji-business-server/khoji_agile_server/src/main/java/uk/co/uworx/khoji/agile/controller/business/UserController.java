/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.controller.business;

import io.swagger.v3.oas.annotations.Operation;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.internal.model.InstanceUserDetails;
import uk.co.uworx.khoji.agile.persistence.dto.KhojiUserDTO;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUserConfig;
import uk.co.uworx.khoji.agile.persistence.model.KhojiUser;
import uk.co.uworx.khoji.agile.persistence.model.UserSettings;
import uk.co.uworx.khoji.agile.response.UserAccountModel;
import uk.co.uworx.khoji.agile.response.UserProfileResponse;
import uk.co.uworx.khoji.agile.service.business.InstanceUserService;
import uk.co.uworx.khoji.agile.service.business.UserService;
import uk.co.uworx.khoji.security.annotations.AuthorizationApplicationLevelAPIs;
import uk.co.uworx.khoji.security.annotations.HasAccessToInstanceWithPrivilege;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/user")
@Log4j2
public class UserController {

    @Autowired
    private UserService userService;
    @Autowired
    private InstanceUserService instanceUserService;

    @PostMapping("/against-token")
    public ResponseEntity<UserAccountModel> getUserNamesAgainstRefreshToken(@RequestBody List<String> refreshTokens)
    {
        return new ResponseEntity<>(
                userService.getUserNamesAgainstRefreshToken(refreshTokens),
                HttpStatus.OK
        );
    }

    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getUserProfile(Principal principal)
    {
        KhojiUser khojiUser = userService.getUserProfileDetails(principal);
        UserSettings userSettings = userService.getUserSettingsByUserId(principal);
        UserProfileResponse userProfileResponse = new UserProfileResponse(khojiUser, userSettings);
        return new ResponseEntity<>(
                userProfileResponse,
                HttpStatus.OK
        );
    }

    @GetMapping("/active")
    @AuthorizationApplicationLevelAPIs
    public ResponseEntity<List<KhojiUserDTO>> getActiveUsers() {
        return new ResponseEntity<>(
                userService.getAllActiveUsers(),
                HttpStatus.OK
        );
    }

    @GetMapping("/me")
    @HasAccessToInstanceWithPrivilege
    public ResponseEntity<InstanceUserDetails> getInstanceUserDetails(Principal principal)
    {
        //Setting null time zone to fetch forcefully
        return new ResponseEntity<>(
                instanceUserService.getInstanceUserDetails(principal, null),
                HttpStatus.OK
        );
    }

    @PostMapping("/validate")
    public ResponseEntity<Map<String, String>> validateUser(@RequestBody String code, Principal principal)
    {

        return new ResponseEntity<>(
                userService.validateUser(code, principal.getName()),
                HttpStatus.OK
        );
    }

    @PostMapping("/update/email")
    @Transactional
    public ResponseEntity<Map<String, String>> updateUserEmailSettings(@RequestBody UserSettings userSettingsToUpdate, Principal principal)
    {
        try {
            userService.updateUserEmailSettings(userSettingsToUpdate, principal);
            return new ResponseEntity<>(
                    Map.of("message", "success"),
                    HttpStatus.OK
            );
        }
        catch (Exception e)
        {
            return new ResponseEntity<>(
                    Map.of("message", e.getCause().toString()),
                    HttpStatus.EXPECTATION_FAILED
            );
        }
    }

    @DeleteMapping("/delete/profile")
    @Transactional
    public ResponseEntity<Map<String, String>> deleteUserProfileAndRelatedInformation(Principal principal)
    {
        try {
            userService.deleteUserProfileAndRelatedInformation(principal);
            return new ResponseEntity<>(
                    Map.of("message", "success"),
                    HttpStatus.OK
            );
        }
        catch (Exception e)
        {
            log.error("User profile deletion failed", e);
            return new ResponseEntity<>(
                    Map.of("message", "failed"),
                    HttpStatus.EXPECTATION_FAILED
            );
        }
    }

    @Operation(summary = "To set user preference in the database")
    @PostMapping("/preferences")
    public ResponseEntity<Object> saveUserPreference(@RequestBody HashMap<String, HashMap<String, Object>> userPreference, Principal principal)
    {
        instanceUserService.saveUserPreferences(userPreference, principal);
        return new ResponseEntity<>(Map.of("message", "configs saved successfully"), HttpStatus.OK);
    }

}
