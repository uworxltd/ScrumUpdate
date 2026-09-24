/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.transform.server;

import lombok.extern.log4j.Log4j2;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;
import uk.co.uworx.khoji.agile.internal.model.Member;
import uk.co.uworx.khoji.agile.transform.ITransform;

import java.util.ArrayList;
import java.util.Map;

@Component("DisplayNameTransformImpl")
@Log4j2
public class DisplayNameTransformImpl implements ITransform
{
  @Override
  public Object transform(final Object data, final Object spec)
  {
    if (data == null)
    {
      return null;
    }

    for (Map map : (ArrayList<Map>) data)
    {
      Map<String, Object> member = (Map) map.get("member");
      String displayName = (String) member.get("fullName");
      try
      {
        Member updatedMember = splitName(displayName);
        member.put("firstName", updatedMember.getFirstName());
        member.put("lastName", updatedMember.getLastName());
        map.put("member", member);
      }
      catch (Exception e)
      {
        log.error("Error occurred while converting display name of user to khoji model", e);
      }
    }
    return data;
  }

  private Member splitName(String fullName)
  {
    Member member = new Member();

    if (StringUtils.isNotEmpty(fullName))
    {
      String[] fullNameArray = fullName.split("\\s+", 2);

      if (fullNameArray.length == 1)
      {
        member.setFirstName(fullNameArray[0]);
        member.setLastName("user");
      }
      else if (fullNameArray.length == 2)
      {
        member.setFirstName(fullNameArray[0]);
        member.setLastName(fullNameArray[1]);
      }
      else
      {
        member.setFirstName(fullName);
        member.setLastName("user");
      }
    }

    return member;
  }
}
 
