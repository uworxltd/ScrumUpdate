/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.service;

import lombok.extern.log4j.Log4j2;
import org.apache.camel.Exchange;
import org.apache.camel.Processor;
import org.apache.camel.ProducerTemplate;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import uk.co.uworx.khoji.agile.config.WorklogConfig;
import uk.co.uworx.khoji.agile.controller.stats.EmailController;
import uk.co.uworx.khoji.agile.handler.ConfigHandler;
import uk.co.uworx.khoji.agile.handler.VelocityTemplateHandler;
import uk.co.uworx.khoji.agile.internal.model.EmailModel;
import uk.co.uworx.khoji.agile.internal.model.WorkLogEmailModel;
import uk.co.uworx.khoji.agile.persistence.service.InstanceDataService;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import static uk.co.uworx.khoji.agile.constant.Constants.DAILY;
import static uk.co.uworx.khoji.agile.constant.Constants.MONTHLY;
import static uk.co.uworx.khoji.agile.constant.Constants.SUFFIX_ND;
import static uk.co.uworx.khoji.agile.constant.Constants.SUFFIX_RD;
import static uk.co.uworx.khoji.agile.constant.Constants.SUFFIX_ST;
import static uk.co.uworx.khoji.agile.constant.Constants.SUFFIX_TH;
import static uk.co.uworx.khoji.agile.constant.Constants.TOTAL_WEEK_DAYS;
import static uk.co.uworx.khoji.agile.constant.Constants.WEEKLY;
import static uk.co.uworx.khoji.agile.controller.stats.EmailController.DIRECT_SWAGGER_CAMEL_ROUTE;
import static uk.co.uworx.khoji.agile.handler.VelocityTemplateHandler.KHOJI_LOGO_WITH_TEXT;

@Component("WorkLogHTMLConverter")
@Log4j2
public class WorkLogHTMLConverter implements Processor
{
  @Autowired
  private VelocityTemplateHandler velocityTemplateHandler;
  @Autowired
  private WorklogConfig worklogConfig;
  @Autowired
  private ProducerTemplate producerTemplate;
  @Autowired
  private ConfigHandler configHandler;
  @Autowired
  private  WorkLogMessageProcessor workLogMessageProcessor;
  @Autowired
  private InstanceDataService instanceDataService;

  public void process(Exchange exchange) throws Exception
  {
    List<WorkLogEmailModel> model = exchange.getIn().getBody(List.class);
    String emailFrequency = null;

    if (exchange.getFromEndpoint().getEndpointUri().equals(DIRECT_SWAGGER_CAMEL_ROUTE))
    {
      emailFrequency = exchange.getIn().getExchange().getProperty(EmailController.FREQUENCY).toString();
    }

    for (WorkLogEmailModel workLog : model)
    {
      log.debug("Converting to HTML for object{}", workLog.getName());
      String html = velocityTemplateHandler.convertOthersWorklogsToHTML(workLog);

      if (StringUtils.isNotEmpty(html))
      {
        String to = workLog.getEmail();
        String subject = getSubjectForWorklogEmail(workLog, emailFrequency);

        EmailModel emailModel = new EmailModel(
                        to,
                        subject,
                        html,
                        workLog.getDateExpiry(),
                        worklogConfig.workLogEmailCreateFile,
                        getKhojiLogoImages()
                );
        log.debug("Putting email on queue for object{}", workLog.getName());

        producerTemplate.setDefaultEndpointUri(configHandler.jmsEmailQueue);
        producerTemplate.sendBody(emailModel);
      }
    }

  }

  private List<String> getKhojiLogoImages()
  {
    List<String> images = new ArrayList<>();
    images.add(KHOJI_LOGO_WITH_TEXT);
    return images;
  }

  /***
   * Method to get subject for new work log email
   * @param workLogEmailModel
   * @return worklogEmailSubject
   */
  private String getSubjectForWorklogEmail(WorkLogEmailModel workLogEmailModel, String emailFrequency)
  {
    String daysIntervals = emailFrequency != null ? emailFrequency : calculateDate(workLogEmailModel.getDateFrom(), workLogEmailModel.getDateTo());
    String dateInterval = getDate(workLogEmailModel.getDateFrom(), workLogEmailModel.getDateTo(), daysIntervals);
    StringBuilder subjectBuilder = new StringBuilder("Khoji Work Log Report").append(" ").append("(").append(dateInterval).append(")");
    return subjectBuilder.toString();
  }

  /***
   * Method to calculate days intervals between daily,weekly and monthly
   * @param worklogDateFrom
   * @param worklogDateTo
   * @return
   */
  private String calculateDate(String worklogDateFrom, String worklogDateTo)
  {
    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    LocalDate dateFrom = LocalDate.parse(worklogDateFrom, formatter);
    LocalDate dateTo = LocalDate.parse(worklogDateTo, formatter);
    long daysBetween = ChronoUnit.DAYS.between(dateFrom, dateTo);

    if(daysBetween <= 1)
    {
      return DAILY;
    }
    else if(daysBetween < TOTAL_WEEK_DAYS)
    {
      return WEEKLY;
    }
    else
    {
      return MONTHLY;
    }
  }

  /***
   * Method to get intervals between dates
   * @param dateFrom date from
   * @param dateTo date to
   * @param daysInterval days interval
   * @return interval dates
   */
  private String getDate(String dateFrom, String dateTo, String daysInterval)
  {
    if(daysInterval.equals(DAILY))
    {
      return parseDateToRequiredFormat(dateFrom);
    }
    else if(daysInterval.equals(WEEKLY))
    {
      return dateFrom+" - "+dateTo;
    }

    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    LocalDate date = LocalDate.parse(dateFrom, formatter);
    String month = date.getMonth().toString();
    return month.substring(0,1).toUpperCase() + month.substring(1).toLowerCase()+" "+Integer.toString(date.getYear());
  }

  /***
   * Method to parse date in format for example 3rd July 2023
   * @param inputDate
   * @return
   */
  private String parseDateToRequiredFormat(String inputDate)
  {
    LocalDate date = LocalDate.parse(inputDate);
    String month = date.getMonth().toString();
    month = month.substring(0,1).toUpperCase() + month.substring(1).toLowerCase();
    StringBuilder subjectBuilder = new StringBuilder().append(date.getDayOfMonth()).append(getSuffixes(date.getDayOfMonth())).append(" ")
            .append(month).append(" ").append(date.getYear());
    return subjectBuilder.toString();
  }

  /***
   * Method to get suffixes against each day
   * @param dayOfMonth
   * @return
   */
  private String getSuffixes(int dayOfMonth)
  {
    String day = Integer.toString(dayOfMonth);
    String suffix;
    switch (day.substring(day.length() - 1)) {
      case "1":
        suffix = SUFFIX_ST;
        break;
      case "2":
        suffix = SUFFIX_ND;
        break;
      case "3":
        suffix = SUFFIX_RD;
        break;
      default:
        suffix = SUFFIX_TH;
        break;
    }

    return suffix;
  }

}
