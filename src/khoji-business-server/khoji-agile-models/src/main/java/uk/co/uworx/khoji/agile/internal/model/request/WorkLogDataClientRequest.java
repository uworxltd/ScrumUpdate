/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model.request;

import uk.co.uworx.khoji.agile.internal.model.Member;
import uk.co.uworx.khoji.agile.persistence.dto.MemberDTO;

import java.util.List;

public class WorkLogDataClientRequest
{
  private List<MemberDTO> memberList;
  private List<String> members;
  private String dateFrom;
  private String dateTo;
  private Integer tenatId;
  private String workLogTenant;

  public WorkLogDataClientRequest()
  {

  }
  public WorkLogDataClientRequest(List<String> members, String dateFrom, String dateTo, Integer tenatId, List<MemberDTO> memberList, String worklogTenant)
  {
    this.memberList = memberList;
    this.members = members;
    this.dateFrom = dateFrom;
    this.dateTo = dateTo;
    this.tenatId = tenatId;
    this.workLogTenant = worklogTenant;
  }

  public List<MemberDTO> getMemberList()
  {
    return memberList;
  }

  public void setMemberList(List<MemberDTO> memberList)
  {
    this.memberList = memberList;
  }

  public List<String> getMembers()
  {
    return members;
  }

  public String getDateFrom()
  {
    return dateFrom;
  }

  public String getDateTo()
  {
    return dateTo;
  }

  public Integer getTenatId()
  {
    return tenatId;
  }

  public void setTenatId(Integer tenatId)
  {
    this.tenatId = tenatId;
  }

  public void setMembers(List<String> members)
  {
    this.members = members;
  }

  public void setDateFrom(String dateFrom)
  {
    this.dateFrom = dateFrom;
  }

  public void setDateTo(String dateTo)
  {
    this.dateTo = dateTo;
  }

  public String getWorkLogTenant()
  {
    return workLogTenant;
  }

  public void setWorkLogTenant(String workLogTenant)
  {
    this.workLogTenant = workLogTenant;
  }
}
