/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.service;

import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.ObjectUtils;
import org.springframework.util.StringUtils;
import uk.co.uworx.khoji.agile.config.EmailConfig;
import uk.co.uworx.khoji.agile.context.BootApplicationContextProvider;
import uk.co.uworx.khoji.agile.handler.ConfigHandler;
import uk.co.uworx.khoji.agile.handler.VelocityTemplateHandler;
import uk.co.uworx.khoji.agile.internal.model.EmailModel;
import uk.co.uworx.khoji.agile.internal.service.MemberService;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;
import uk.co.uworx.khoji.agile.persistence.service.InstanceUserDataService;
import uk.co.uworx.khoji.agile.request.WorkLogReminderRequest;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
@Log4j2
public class WorkLogReminderService
{

  private MemberService memberService;
  @Autowired
  private AdminService adminService;
  @Autowired
  private ConfigHandler configHandler;
  @Autowired
  private EmailConfig emailConfig;
  @Autowired
  private VelocityTemplateHandler velocityTemplateHandler;
  @Autowired
  private InstanceUserDataService instanceUserDataService;

  public void processReminder(WorkLogReminderRequest request) throws Exception
  {
//    Fetch the supervisor
    InstanceUser supervisor = instanceUserDataService.findInstanceUserById(Long.parseLong(request.getSupervisorId()));

    if (!ObjectUtils.isEmpty(supervisor))
    {
      sendReminders(supervisor, request);
    }
    else
    {
      log.error("Supervisor not found");
    }
  }

  private void sendReminders(InstanceUser supervisor, WorkLogReminderRequest request) throws Exception
  {
    emailConfig = BootApplicationContextProvider.getContext().getBean("emailConfig", EmailConfig.class);
    configHandler = BootApplicationContextProvider.getContext().getBean("configHandler", ConfigHandler.class);
    String tenantName = supervisor.getInstance().getInstanceName();
    String ownerName = supervisor.getInstance().getWorkspace().getOwner().getFullName();


    for (String memberId : request.getMemberIds())
    {
      InstanceUser instanceUser = instanceUserDataService.findInstanceUserById(Long.parseLong(memberId));

      if (StringUtils.hasLength(instanceUser.getEmail()))
      {
        log.debug("About to send email to user: {}", instanceUser.getAccountId());
        String html = velocityTemplateHandler.convertWorkLogReminderToEmailHTML(
                instanceUser.getFullName().split(" ")[0],
                supervisor.getFullName(),
                tenantName,
                ownerName,
                convertUrl(request.getWorkLogUrl()),
                convertDate(request.getDateFrom()),
                convertDate(request.getDateTo()),
                request.getCustomText(),
                configHandler.supportEmail
        );

        String memberEmail = instanceUser.getEmail();

        EmailModel emailModel = new EmailModel(
                memberEmail,
                String.format("%s has asked you to complete your work log", supervisor.getFullName()),
                html,
                LocalDate.now().toString(),
                false,
                null
        );

        adminService.sendEmail(
                configHandler.jmsEmailQueue,
                emailModel,
                "Exception occurred while generating worklog reminder email"
        );
      }
      else
      {
        log.debug("Email not added against: {}", instanceUser.getAccountId());
      }
    }
  }

  public static String convertUrl(String originalUrl) {
    // extract the existing query params
    String[] urlParts = originalUrl.split("\\?", 2);
    String path = urlParts[0];
    String query = urlParts.length > 1 ? urlParts[1] : "";

    // Split path to extract segments
    String[] pathSegments = path.split("/");

    // Extract required parts to create url
    String instance = pathSegments[6];
    String KFADomain = pathSegments[2];
    String httpPart = pathSegments[0];

    // Build the new URL
    return httpPart + "//" + KFADomain + "/login?instance=" + instance + "&feature=team-view" + (query.isEmpty() ? "" : "&" + query);
  }

  public static String convertDate(String inputDate)
  {
    DateTimeFormatter inputFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    DateTimeFormatter outputFormat = DateTimeFormatter.ofPattern("d'%s' MMMM yyyy", Locale.ENGLISH);

    LocalDate date = LocalDate.parse(inputDate, inputFormat);

    String daySuffix = getDaySuffix(date.getDayOfMonth());

    return String.format(date.format(outputFormat), daySuffix);
  }

  private static String getDaySuffix(int day)
  {
    if (day >= 11 && day <= 13)
    {
      return "th";
    }

    return switch (day % 10)
    {
      case 1 -> "st";
      case 2 -> "nd";
      case 3 -> "rd";
      default -> "th";
    };
  }
}
