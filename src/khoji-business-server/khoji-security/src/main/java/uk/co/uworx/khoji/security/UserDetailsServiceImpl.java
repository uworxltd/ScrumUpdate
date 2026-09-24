/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.security;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uk.co.uworx.khoji.agile.persistence.model.KhojiUser;
import uk.co.uworx.khoji.agile.persistence.service.KhojiUserDataService;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class UserDetailsServiceImpl implements UserDetailsService
{
  private final KhojiUserDataService khojiUserDataService;

  public UserDetailsServiceImpl(KhojiUserDataService khojiUserDataService)
  {
    this.khojiUserDataService = khojiUserDataService;
  }

  @Override
  public UserDetails loadUserByUsername(String username) throws DisabledException
  {
    Optional<KhojiUser> user = khojiUserDataService.findByEmail(username);

    List<SimpleGrantedAuthority> authorities = new ArrayList<>();
    boolean accountStatusActive = true;
    if (user.isPresent())
    {
      authorities.add(new SimpleGrantedAuthority("USER"));


      return new User(
              user.get().getEmail(),
              user.get().getPassword(),
              true,
              true,
              true,
              accountStatusActive,
              authorities
      );
    }

    throw new BadCredentialsException("User " + username + " doesn't exist in database");
  }
}
