/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.transform.cloud;

import org.springframework.stereotype.Component;
import uk.co.uworx.khoji.agile.transform.ITransform;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Jolt transformation class for Date
 */
@Component("DanishDateStringTransform")
public class DanishDateStringTransform implements ITransform {
    public DanishDateStringTransform() {
    }

    @Override
    public Object transform(Object data, Object spec) {
        if (data == null) {
            return null;
        }
        if (spec != null) {
            LinkedHashMap attributes = (LinkedHashMap) ((LinkedHashMap) spec).get("values");
            if (attributes.get("isIssueList") != null && (boolean) attributes.get("isIssueList") == true) {
                ((LinkedHashMap) spec).remove("isIssueList");
                for (Map map : (ArrayList<Map>) data) {
                    map.put("sprintList", transformSprintList(map.get("sprintList"), spec));
                }
            } else {
                data = transformSprintList(data, spec);
            }
        }
        return data;
    }

    private Object transformSprintList(Object data, Object spec) {
        if (data != null) {
            for (Object object : ((LinkedHashMap) ((LinkedHashMap) spec).get("values")).keySet()) {
                String date;
                String attribute = (String) object;
                for (Map map : (ArrayList<Map>) data) {
                    date = (String) map.get(attribute);
                    if (date != null) {
                        ArrayList<String> localDate = new ArrayList<>();
                        localDate.add((date.substring(0, 4)));
                        localDate.add((date.substring(5, 7)));
                        localDate.add((date.substring(8, 10)));
                        map.put(attribute, String.join("-", localDate));
                    }
                }
            }
        }
        return data;
    }
}
