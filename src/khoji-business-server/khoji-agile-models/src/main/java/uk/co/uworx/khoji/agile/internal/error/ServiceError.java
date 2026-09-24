/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.error;

import org.springframework.http.HttpStatus;

import java.text.MessageFormat;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.GATEWAY_TIMEOUT;
import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;
import static org.springframework.http.HttpStatus.METHOD_NOT_ALLOWED;
import static org.springframework.http.HttpStatus.NOT_ACCEPTABLE;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.http.HttpStatus.NOT_IMPLEMENTED;
import static org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;
import static org.springframework.http.HttpStatus.UNSUPPORTED_MEDIA_TYPE;

public enum ServiceError
{
  G0000("General processing exception.", INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  // Unimplemented in application
  G0100("Temporarily Unavailable or not implemented.", SERVICE_UNAVAILABLE, ResponseType.ERROR),
  // reserved for Timeout to external services. 503
  G0101("Integration timeout or not accessible.", GATEWAY_TIMEOUT, ResponseType.ERROR),
  // Reserved for 400 General Request Validation
  G0400("Request validation error.", BAD_REQUEST, ResponseType.ERROR),
  // Reserved for general not found 404
  G0401("Not found.", NOT_FOUND, ResponseType.ERROR),
  // Reserved for method not supported
  G0402("Request method not supported.", METHOD_NOT_ALLOWED, ResponseType.ERROR),
  // reserved for 415 invalid media type
  G0403("Invalid media type.", UNSUPPORTED_MEDIA_TYPE, ResponseType.ERROR),
  // added double single quotes, this will be treated as single quot in
  // MessageFormat.format method to replace the {0}
  GO503("We couldn''t connect to {0}. Please try again.", SERVICE_UNAVAILABLE, ResponseType.ERROR),

  G1400("Provided Action is Currently not Supported.", HttpStatus.BAD_REQUEST, ResponseType.ERROR),

  I1000("instance_id or tenant_id is not provided in the headers", HttpStatus.BAD_REQUEST, ResponseType.ERROR),
  IP000("Identity provider not found against email", HttpStatus.BAD_REQUEST, ResponseType.ERROR),
  IP001("Identity provider not found against ScrumUpdate User Id", HttpStatus.BAD_REQUEST, ResponseType.ERROR),
  LC1000("No instance provider found against provided login code", HttpStatus.BAD_REQUEST, ResponseType.ERROR),
  M1000("Can not perform mapping", INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  W0404("Workspace not found against given id", INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  U0404("User not found against principal", INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  F0404("feature not found against id", INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  I0404("Instance not found against id", INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  IN000("Invite is already accepted.", INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  I0409("App set up failed. This app already exists.", CONFLICT, ResponseType.ERROR),
  I0401("User does not have access to instance", UNAUTHORIZED, ResponseType.ERROR),
  I1401("User does not have necessary privileges to access the resource of instance", UNAUTHORIZED, ResponseType.ERROR),
  PR0404("Principal not found in request", UNAUTHORIZED, ResponseType.ERROR),
  AR404("Accessible Resources Not available", UNAUTHORIZED, ResponseType.ERROR),
  UA404("User access not found against token", INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  AAD404("Integration not found against token", NOT_FOUND, ResponseType.ERROR),
  // -----dont change this or use this until required, hard linking on FE
  UA400("User access not found", INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  // ------------
  TR400("Response from Jira is empty", INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  TR401("Transformed Response from Jira is empty", INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  NA001("AccountId and email does not have linking", NOT_ACCEPTABLE, ResponseType.ERROR),
  NA002("User is revoked by the invitee.", NOT_ACCEPTABLE, ResponseType.ERROR),
  U0401("User is revoked and does not have access", UNAUTHORIZED, ResponseType.ERROR),
  EP501("Endpoint is not implemented against the type", NOT_IMPLEMENTED, ResponseType.ERROR),

  // KhojiX errors
  SP404("Latest active sprint not found", NOT_FOUND, ResponseType.ERROR),
  SPS404("Active sprints not found", NOT_FOUND, ResponseType.ERROR),
  SD404("Synced Data not found", NOT_FOUND, ResponseType.ERROR),
  KX400("Error occurred while making external system requests", BAD_REQUEST, ResponseType.ERROR),
  KSS100("Error occured while provisioning tenant", CONFLICT, ResponseType.ERROR),

  // Reserved for Report Publishing Failure
  R0500("The report creation or publishing to the confluence failed.", INTERNAL_SERVER_ERROR, ResponseType.ERROR),

  M0414("Please enter email address or account id.", FORBIDDEN, ResponseType.ERROR),
  M0409("A member with this email already exists.", HttpStatus.CONFLICT, ResponseType.ERROR),
  C0409("Consent account is different from signed up account",HttpStatus.CONFLICT, ResponseType.ERROR),
  M0410("Account ID is already in use.", HttpStatus.CONFLICT, ResponseType.ERROR),
  MT0404("Members team is not found.", NOT_FOUND, ResponseType.ERROR),
  M0404("Member is not found.", NOT_FOUND, ResponseType.ERROR),
  TML0400("Teams Member limit has been reached",BAD_REQUEST,ResponseType.ERROR),

  U0000("Email already exists.", HttpStatus.CONFLICT, ResponseType.ERROR),
  U0100("User does not exist.", NOT_FOUND, ResponseType.ERROR),
  U0107("The link for signup email is invalid or expired.", NOT_FOUND, ResponseType.ERROR),
  U0101("User Settings does not exist.", NOT_FOUND, ResponseType.ERROR),
  U0102("Username already exists.", HttpStatus.CONFLICT, ResponseType.ERROR),
  U0103("User and Team not found.", NOT_FOUND, ResponseType.ERROR),
  U0104("Cannot delete, Please delete related ScrumUpdate users first.", CONFLICT, ResponseType.ERROR),
  U0105("Unsuccessful Changes! Email address of a user with \"Joined\" or \"Revoked\" status cannot be edited.", BAD_REQUEST, ResponseType.ERROR),

  U0106("Logged-In user cannot be Revoked", BAD_REQUEST, ResponseType.ERROR),
  UL0400("User limit has been reached",FORBIDDEN,ResponseType.ERROR),
  // Mxxxx Errors group represent errors for Members API
  M0900("Members team is not found.", NOT_FOUND, ResponseType.ERROR),

  // Pxxxx Errors group represent errors for Projects API
  P0404("Project is not found.", NOT_FOUND, ResponseType.ERROR),
  P0409("Duplicate project by project ID.", CONFLICT, ResponseType.ERROR),
  P0410("Cannot delete, Please delete related ScrumUpdate project first in boards.", CONFLICT, ResponseType.ERROR),
  P0500("Failed to sync project source users with payment source.", INTERNAL_SERVER_ERROR, ResponseType.ERROR),

  // Bxxxx Errors group represent errors for Team Board API
  B0404("No board found against ID/key.", NOT_FOUND, ResponseType.ERROR),
  B0405("No such project exists.", NOT_FOUND, ResponseType.ERROR),
  B0409("Duplicate board by board ID.", CONFLICT, ResponseType.ERROR),
  B1404("No sprint found for the selected date range. Please check the start and end date of the desired sprint or expand your search.", NOT_FOUND, ResponseType.WARNING),
  B0410("Team board Identifier or Data Source cannot be empty.", BAD_REQUEST, ResponseType.ERROR),

  // Txxxx Errors group represent errors for Teams API
  T0404("No team found against team ID.", NOT_FOUND, ResponseType.ERROR),
  T0405("No team member found against team ID.", NOT_FOUND, ResponseType.ERROR),
  T0406("No team board found against team ID.", NOT_FOUND, ResponseType.ERROR),
  T0407("Invalid user name.", NOT_FOUND, ResponseType.ERROR),
  T0409("Duplicate team name.", CONFLICT, ResponseType.ERROR),
  T0410("Member does not exist.", NOT_FOUND, ResponseType.ERROR),
  T0411("Board does not exist.", NOT_FOUND, ResponseType.ERROR),
  TL0400("Team limit has been reached",FORBIDDEN,ResponseType.ERROR),

  T0412("Team cannot be deleted, Delete related ScrumUpdate users.", CONFLICT, ResponseType.ERROR),
  T0413("Team cannot be deleted, Remove related association first.", CONFLICT, ResponseType.ERROR),
  T0414("Failed to update team details", INTERNAL_SERVER_ERROR, ResponseType.ERROR),

  // Oxxxx Errors group represent errors for Organization API
  O0409("Organization Code already exists.", CONFLICT, ResponseType.ERROR),
  O0408("Organization Code cannot be null.", BAD_REQUEST, ResponseType.ERROR),
  O0400("Required organization attribute not provided.", BAD_REQUEST, ResponseType.ERROR),
  O0404("Organization not found.", NOT_FOUND, ResponseType.ERROR),
  O1400("Email should have a valid format.", BAD_REQUEST, ResponseType.ERROR),
  O2400("Phone number should have a valid format.", BAD_REQUEST, ResponseType.ERROR),
  O2409("Unable to delete Organization. Please unassign location \"%s\" from teams or members.", CONFLICT, ResponseType.ERROR),

  // Oxxxx Errors group represent errors for Organization API
  LO0409("Location Name already exists for organisation.", CONFLICT, ResponseType.ERROR),
  L0400("Required location attribute not provided.", BAD_REQUEST, ResponseType.ERROR),
  L0404("Location not found.", NOT_FOUND, ResponseType.ERROR),
  L1409("Location name already exists.", CONFLICT, ResponseType.ERROR),
  L1400("Required request object not provided.", BAD_REQUEST, ResponseType.ERROR),
  L2409("Unable to delete location. Please unassign location \"%s\" from teams or members.", CONFLICT, ResponseType.ERROR),
  L2400("Email should have a valid format.", BAD_REQUEST, ResponseType.ERROR),
  L3400("Phone number should have a valid format.", BAD_REQUEST, ResponseType.ERROR),

  //Epic Controller errors
  E0400("Invalid request the request should contain at least one release.", BAD_REQUEST, ResponseType.ERROR),

  //Target Service errors
  TS0400("Target service could not validate request.", HttpStatus.BAD_REQUEST, ResponseType.ERROR),
  TS0500("Target service could not process request.", HttpStatus.INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  TS0404("Could not connect to target service.", HttpStatus.NOT_FOUND, ResponseType.ERROR),

  //Project and Source Service errors
  PS0105("A project source already exists. ScrumUpdate does not allow multiple project sources.", HttpStatus.BAD_REQUEST, ResponseType.ERROR),
  //Source Service errors
  PS0106("A source system already exists. ScrumUpdate does not allow multiple project sources.", HttpStatus.BAD_REQUEST, ResponseType.ERROR),
  PS0107("Unable to verify the given source details.", HttpStatus.NOT_FOUND, ResponseType.ERROR),
  PS0108("Error fetching projects against the given source details.", HttpStatus.INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  PS0109("Error fetching users against the given source details.", HttpStatus.INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  PS0110("Error fetching issue status category against the given source details.", HttpStatus.INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  PS0111("Error while saving details. Please try again", HttpStatus.INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  PS0112("Enable to fetch accessible resources from source", HttpStatus.INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  PS0113("Unable to fetch user's timezone from Source. Please verify provided accountId.", NOT_FOUND, ResponseType.ERROR),
  PS0114("Unable to fetch user's activity from Source. Please verify provided accountId.", NOT_FOUND, ResponseType.ERROR),


  //Transformation Errors
  TRNSF0500("Request body could not be transformed.", HttpStatus.INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  SU0001("The link for signup form is invalid or has expired.", NOT_FOUND, ResponseType.ERROR),

// Reserved for roles CRUD operations
  R0404("Role is not found.", NOT_FOUND, ResponseType.ERROR),
  R0409("Role already exists.", CONFLICT, ResponseType.ERROR),

  R0000("Role code already exists.", CONFLICT, ResponseType.ERROR),
  R0001("Role name already exists.", CONFLICT, ResponseType.ERROR),

  // User already joined error
  US001("The user has already joined. Please refresh the page.", CONFLICT, ResponseType.ERROR),
  US005("No user found against account id", NOT_FOUND, ResponseType.ERROR),
  US002("Action not supported for source user.", CONFLICT, ResponseType.ERROR),
  US003("User update failed. Invite could not be sent.", INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  US004("Failed to delete account. Please try again.", INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  
  //Subscription operations and errors
  SB002("Subscription already exists.", CONFLICT, ResponseType.ERROR),
  SB003("Subscription not found.", NOT_FOUND, ResponseType.ERROR),
  SB004("Failed to update subscription details in database.", INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  SB005("Failed to save subscription details in database.", INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  TD001("Customer not found.", NOT_FOUND, ResponseType.ERROR),
  TD002("Customer already exist.", CONFLICT, ResponseType.ERROR),
  TD003("Unable to parse customer meta data into JSON.", CONFLICT, ResponseType.ERROR),
  TD004("Failed to update customer meta data", INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  TD005("Failed to cancel subscription", INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  IT001("Failed to get Item id from Item Price Id.", NOT_FOUND, "error"),
  PL001("Plan not found.", NOT_FOUND, ResponseType.ERROR),
  PL002("Plan already exists.", CONFLICT, ResponseType.ERROR),
  PL003("Plan meta data does not exist.", NOT_FOUND, ResponseType.ERROR),
  PL004("Failed to get Plan id from price Id.", NOT_FOUND, ResponseType.ERROR),
  PL005("Failed to get Plan detail from Plan Id.", NOT_FOUND, ResponseType.ERROR),

  TD006("Unable to parse plan meta data into JSON.", CONFLICT, ResponseType.ERROR),
  PS001("Payment source already exists. Multiple payment sources cannot be integrated with ScrumUpdate.", BAD_REQUEST, ResponseType.ERROR),
  PS002("Payment Source not found.", NOT_FOUND, ResponseType.ERROR),
  PS003("Failed to get response from API.", NOT_FOUND, ResponseType.ERROR),
  PE001("Could not Transforming Payment Event JSON to Payment Event Object.", NOT_FOUND,ResponseType.ERROR),
  PE002("Could not Transforming Plan Event JSON to Object.", NOT_FOUND,ResponseType.ERROR),
  HS001("Payment Source URL or API token not found.", NOT_FOUND, ResponseType.ERROR),
  HS500("Failed to fetch subscription information.", INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  SC001("Unable to match the response received from source.", INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  SC002("Failed to update users count on the source.", INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  SC003("Failed to fetch strategy from source.", INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  UA001("Unauthorized", UNAUTHORIZED, ResponseType.ERROR),
  AO001("Addon details not found.", NOT_FOUND, ResponseType.ERROR),
  AO002("Failed to create AddOnDetail.", NOT_FOUND, ResponseType.ERROR),
  AO003("Unable to parse addon data to create AddOnDetail.", NOT_FOUND, ResponseType.ERROR),
  AO004("Addon not found on source.", NOT_FOUND, ResponseType.ERROR),
  AO005("Addon not attached with the subscription.", NOT_FOUND, ResponseType.ERROR),
  AS001("AddOnStrategy not found.", NOT_FOUND, ResponseType.ERROR),


  //Access Levels errors
  AL001("Access level not found against user.", NOT_FOUND, ResponseType.ERROR),
  AL002("Action not allowed.", CONFLICT, ResponseType.ERROR),
  AL003("Access Level of the logged-in user can not be changed.", BAD_REQUEST, ResponseType.ERROR),

  //Questions/Survey Errors
  QA500("Question should have exactly one selected option", INTERNAL_SERVER_ERROR, ResponseType.ERROR),

  //Quick Search errors
  QA001("Failed to load the quick search data. Please be patient and try again.",INTERNAL_SERVER_ERROR, ResponseType.ERROR),

  CE101("Failed to parse cron expression.", HttpStatus.UNPROCESSABLE_ENTITY, ResponseType.ERROR),

  P0100("You have entered an old password. Please select a new password for your account.", CONFLICT, ResponseType.ERROR),

  FE100("Feature is already unlocked.", CONFLICT, ResponseType.ERROR),
  IU001("No user found against instance id", CONFLICT, ResponseType.ERROR),

  AI001("Error while generating AI response. Please try again.", INTERNAL_SERVER_ERROR, ResponseType.ERROR),

  SE001("The requested operation is forbidden for all instances.", FORBIDDEN , ResponseType.ERROR),
  SE002("The requested operation is forbidden for this instance.", FORBIDDEN , ResponseType.ERROR),
  SE003("Unauthorized Exception from source, needs re-authentication", UNAUTHORIZED , ResponseType.ERROR),
  PD001("Error while resetting properties to default", INTERNAL_SERVER_ERROR, ResponseType.ERROR),
  IUC001("Failed to save user config", INTERNAL_SERVER_ERROR, ResponseType.ERROR);


  private final String message;
  private final HttpStatus httpStatus;
  private final String responseType;

  ServiceError(String message, HttpStatus httpStatus, String responseType)
  {
    this.message = message;
    this.httpStatus = httpStatus;
    this.responseType = responseType;
  }

  public String getMessage()
  {
    return message;
  }

  public HttpStatus getHttpStatus()
  {
    return this.httpStatus;
  }

  public String getResponseType()
  {
    return responseType;
  }

  @Override
  public String toString()
  {
    return getMessage();
  }

  /**
   * Format the message string system token if any by replacing with the system name e.g Jira or Confluence
   *
   * @param systemName jira/confluence
   * @return formated string
   */
  public String getMessageForTargetSystem(String systemName)
  {
    return MessageFormat.format(message, systemName);
  }


  private static class ResponseType
  {
    private static final String ERROR = "error";
    private static final String WARNING = "warning";
  }
}
