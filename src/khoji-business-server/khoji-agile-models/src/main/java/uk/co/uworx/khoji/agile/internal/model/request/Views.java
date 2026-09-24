/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model.request;

/**
 * Views handle which attributes
 * will be sent as a response from
 * an API. Views will be applied to
 * only required attributes of a model
 * to enhance performance.
 */
public class Views
{
  public static class BasicUser
  {
  }

  public static class User extends BasicUser
  {
  }

  public static class UserSummary extends User
  {
  }

  public static class UserInTeam extends User
  {
  }

  public static class BoardsInTeam
  {
  }

  public static class Team extends BoardsInTeam
  {
  }

  public static class Board extends BoardsInTeam
  {
  }

  public static class UserProfileView extends TeamsOfUser
  {
  }

  public static class TeamsOfUser extends UserSummary
  {
  }

  public static class StatsReleasesAPI
  {
  }
}
