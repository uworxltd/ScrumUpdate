/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.stats.provider.jira.helper;

import com.bazaarvoice.jolt.Chainr;
import com.bazaarvoice.jolt.JsonUtil;
import com.bazaarvoice.jolt.JsonUtilImpl;
import com.bazaarvoice.jolt.JsonUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.util.ObjectUtils;
import org.springframework.util.StringUtils;
import uk.co.uworx.khoji.agile.handler.ConfigHandler;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.internal.model.CustomFieldTemplateParameters;
import uk.co.uworx.khoji.agile.internal.model.Issue;
import uk.co.uworx.khoji.agile.liquid.LiquidTemplateHandler;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component("JoltHelperServerImpl")
@Log4j2
public class JoltHelperServerImpl implements IJiraResponseTransformer
{
  HashMap<String, Chainr> transformersList = new HashMap<>();
  Map<String, String> templates = new HashMap<>();

//  private CustomFieldsService customFieldsService;
  @Autowired
  private LiquidTemplateHandler liquidTemplateHandler;
  @Autowired
  private ConfigHandler configHandler;

  @Override
  public Object transformObj(Object response, String fileName, String templatePath, TypeReference typeReference)
  {
    Object transformedObject = new ArrayList<>();

    if (response != null)
    {
      try
      {
        Chainr chainr = Chainr.fromSpec(JsonUtils.classpathToList(fileName));
        Object transformedOutput = chainr.transform(response);
        if (transformedOutput == null)
        {
          return transformedObject;
        }
        transformedObject = new ObjectMapper().readValue(JsonUtils.toJsonString(transformedOutput), typeReference);
      }
      catch (IOException e)
      {
        log.error("Error transforming object. ", e);
      }
    }
    return transformedObject;
  }

  @Override
  public Object transformObj(final Object response, final String fileName, final TypeReference typeReference)
  {
    return transformObj(response, fileName, null, typeReference);
  }

  @Override
  public List<Object> transformList(Object response, String fileName, String templatePath, TypeReference typeReference)
  {
    List<Object> transformedObject = new ArrayList<>();

    if (response != null)
    {
      try
      {
        Object transformedOutput = getTransformer(fileName, templatePath).transform(response);
        if (transformedOutput == null)
        {
          return transformedObject;
        }
        ObjectMapper objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule());
        JsonUtil util = new JsonUtilImpl(objectMapper);
        transformedObject = (List<Object>) objectMapper.readValue(util.toJsonString(transformedOutput), typeReference);
//        if(transformedObject != null && ((List<?>) transformedObject).get(0) instanceof Issue)
//        {
//          if (customFieldsService.hasSameCustomFieldForStoryPointAndHLE())
//              transformedObject = updateIssuesForSameStoryPointsAndHLECustomFields(transformedObject);
//        }
      }

      catch (IOException e)
      {
        log.error("Error transforming list. ", e);
      }
    }
    return transformedObject;
  }

  private List<Object> updateIssuesForSameStoryPointsAndHLECustomFields(Object transformedObject) {
    List<Issue> issues = (ArrayList) transformedObject;
    List<Issue> transformedIssues = issues.stream().map(issue -> {
      Issue transformIssue = new Issue(issue);
      transformIssue.getEstimates().setHighLevelEstimate(issue.getStoryPoints());
      return transformIssue;
    }).toList();
    return new ArrayList<>(transformedIssues);
  }


  @Override
  public List<Object> transformList(final Object response, final String fileName, final TypeReference typeReference)
  {
    return transformList(response, fileName, null, typeReference);
  }

  @Override
  public <T> T transformObject(Object response, String fileName, Class<T> clazz)
  {
    if (ObjectUtils.isEmpty(response)) throw new ServiceException(ServiceError.TR400);
    try {
      Chainr chainr = Chainr.fromSpec(JsonUtils.classpathToList(fileName));
      Object transformedOutput = chainr.transform(response);
      if (ObjectUtils.isEmpty(transformedOutput)) throw new ServiceException(ServiceError.TR401);
      return new ObjectMapper()
              .registerModule(new JavaTimeModule())
              .convertValue(transformedOutput, clazz);

    }
    catch (Exception e)
    {
      log.debug("failed to convert message", e);
      throw e;
    }
  }

  private Chainr getTransformer(String filePath, String templatePath)
  {
    if (transformersList.containsKey(filePath))
    {
      return transformersList.get(filePath);
    }
    else
    {
      Chainr transformer = null;
      List<Object> spec = JsonUtils.classpathToList(filePath);
      if(StringUtils.hasLength(templatePath))
      {
        String updatedSpec = liquidTemplateHandler.renderTemplate(getTemplateAgainstTenant(configHandler.TENANT_ID, templatePath), getSpecParams(spec));
        transformer = Chainr.fromSpec(convertJsonStringToList(updatedSpec));
      }
      else
      {
        transformer = Chainr.fromSpec(spec);
      }
      transformersList.put(filePath, transformer);
      return transformer;
    }
  }

  private List<Object> convertJsonStringToList(final String updatedSpec)
  {
    return JsonUtils.jsonToList(updatedSpec);
  }

  private CustomFieldTemplateParameters getSpecParams(final List<Object> spec)
  {
    CustomFieldTemplateParameters parameters = new CustomFieldTemplateParameters();

    try
    {
      parameters.setSpec(new ObjectMapper().writeValueAsString(spec));
    }
    catch (JsonProcessingException e)
    {
      log.error("Unable to convert spec for passing through template. Reason: {}", e.getMessage(), e);
    }

    //customFieldsService.setGenericCustomFields(parameters);
    return parameters;
  }

  private String getTemplateAgainstTenant(String tenantId, String templatePath)
  {
    //Todo Before parsing make sure there is no empty line at the end of file else the template will not be parsed
    if (templates.get(tenantId) != null)
    {
      return templates.get(tenantId);
    }

    String template = null;
    try
    {
      InputStream resource = new ClassPathResource(templatePath).getInputStream();
      template = new String(resource.readAllBytes(), StandardCharsets.UTF_8);
      templates.put(tenantId, template);
    }
    catch (IOException e)
    {
      log.error("Unable to read the templates from config. Reason: {}", e.getMessage(), e);
    }

    return template;
  }

  public void resetTransformerList()
  {
    transformersList = new HashMap<>();
  }
}
