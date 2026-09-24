/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SignUp
{
  private String firstName;
  private String lastName;
  private String password;
  private String email;
  private String image;
  private String url;
  private boolean userAgreement;
  private boolean privacyPolicy;
  private Location location;

  @Override
  public String toString()
  {
    return "SignUp{" +
            "firstName='" + firstName + '\'' +
            ", lastName='" + lastName + '\'' +
            ", password='xxxxxxxx'"       +
            ", email='" + email + '\'' +
            '}';
  }
}
