/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.controller.admin.api;


import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

import uk.co.uworx.khoji.agile.persistence.model.Roles;

import java.util.List;

@CrossOrigin
@RequestMapping("/user/roles")
public interface RoleAPI
{
  @GetMapping
  @Operation(summary = "Get Roles")
  ResponseEntity<List<Roles>> getRoles();

  @PostMapping
  @Operation(summary = "Create new Role")
  ResponseEntity<Roles> createNewRole(@Valid @RequestBody Roles.Request roles);
}
