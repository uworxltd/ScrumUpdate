/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.transform.cloud;

import com.bazaarvoice.jolt.SpecDriven;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import uk.co.uworx.khoji.agile.handler.ConfigHandler;
import uk.co.uworx.khoji.agile.transform.ITransform;

import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;

/**
 * Jolt transformation class for Comment Body
 */
@Component("UpdatedDateTimeTransformImpl")
public class UpdatedDateTimeTransformImpl implements SpecDriven, ITransform {
    public static final DateTimeFormatter SOURCE_SYSTEM_DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm:ss.SSSX");

    public UpdatedDateTimeTransformImpl() {
    }

    @Override
    public Object transform(Object data, Object spec)
    {
        if (data == null) {
            return null;
        }
      for (LinkedHashMap issue : (ArrayList<LinkedHashMap>) data)
      {
        String sourceUpdatedTime = (String) issue.get("sourceUpdatedTime");
        if(sourceUpdatedTime != null)
        {
          issue.put("updatedTime", ZonedDateTime.parse(sourceUpdatedTime,SOURCE_SYSTEM_DATE_TIME_FORMATTER));
        }
      }
        return data;
    }


}

