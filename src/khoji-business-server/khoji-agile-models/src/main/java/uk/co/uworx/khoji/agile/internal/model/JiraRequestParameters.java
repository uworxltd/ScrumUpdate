/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class JiraRequestParameters
{
  String queryId = "";
  String dateFrom = "";
  String dateTo = "";
  String issueId = "";
  String release = "";
  String parentId = "";
  String customJQL = "";
  String epicId = "";
  String updatedDate = "";
  String updatedDatePlusOne = "";
  String teamBoardCfKey = "";
  String sprintCfKey = "";
  String requestedDate = "";
  String todayDatePlus1 = "";
  String requestedDateMinus30Days = "";
  String userAccountId = "";
  String userName = "";
  List<String> summaryKeyWords;

  boolean allTeamsSelected;

  List<String> memberNames = new ArrayList<>();
  List<String> teamBoardNames = new ArrayList<>();
  List<String> issueIds = new ArrayList<>();
  List<String> projectKeys = new ArrayList<>();
  List<String> filterKeys = new ArrayList<>();
  List<String> epicIds = new ArrayList<>();
  List<String> parentIds = new ArrayList<>();
  List<TeamBoard> teamBoards = new ArrayList<>();
  List<String> sprintIds = new ArrayList<>();
  List<String> issueTypes = new ArrayList<>();
}
