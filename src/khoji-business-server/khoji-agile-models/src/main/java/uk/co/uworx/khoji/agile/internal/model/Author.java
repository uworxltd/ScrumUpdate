/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.annotation.JsonIgnore;

public class Author
{
  private String name;
  private String key;
  private String emailAddress;
  @JsonIgnore
  private AvatarUrls avatarUrls;
  private String displayName;
  private Boolean active;
  private String timeZone;
  private String accountId;

  public String getName()
  {
    return name;
  }

  public void setName(String name)
  {
    this.name = name;
  }

  public String getKey()
  {
    return key;
  }

  public void setKey(String key)
  {
    this.key = key;
  }

  public String getEmailAddress()
  {
    return emailAddress;
  }

  public void setEmailAddress(String emailAddress)
  {
    this.emailAddress = emailAddress;
  }

  public AvatarUrls getAvatarUrls()
  {
    return avatarUrls;
  }

  public void setAvatarUrls(AvatarUrls avatarUrls)
  {
    this.avatarUrls = avatarUrls;
  }

  public String getDisplayName()
  {
    return displayName;
  }

  public void setDisplayName(String displayName)
  {
    this.displayName = displayName;
  }

  public Boolean getActive()
  {
    return active;
  }

  public void setActive(Boolean active)
  {
    this.active = active;
  }

  public String getTimeZone()
  {
    return timeZone;
  }

  public void setTimeZone(String timeZone)
  {
    this.timeZone = timeZone;
  }

  public String getAccountId()
  {
    return accountId;
  }

  public void setAccountId(final String accountId)
  {
    this.accountId = accountId;
  }
}
