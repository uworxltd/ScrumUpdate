/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import lombok.extern.log4j.Log4j2;
import org.apache.camel.Exchange;
import org.apache.camel.Processor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import uk.co.uworx.khoji.agile.config.EmailConfig;
import uk.co.uworx.khoji.agile.handler.ConfigHandler;
import uk.co.uworx.khoji_email.EmailModel.ContentType;
import uk.co.uworx.khoji_email.SendEmail;

import java.io.FileNotFoundException;
import java.io.PrintWriter;
import java.io.UnsupportedEncodingException;
import java.time.LocalDate;


@Component("EmailProcessor")
@Log4j2
public class EmailProcessor implements Processor
{
  @Autowired
  private EmailConfig emailConfig;
  @Autowired
  private ConfigHandler configHandler;

  public void process(Exchange exchange) throws Exception
  {
    if (!emailConfig.isConfigured())
    {
      log.warn("Email not configured (EMAIL_FROM/EMAIL_HOST/EMAIL_USERNAME/EMAIL_PASSWORD missing) — skipping email");
      return;
    }
    EmailModel model = (EmailModel) exchange.getIn().getBody(EmailModel.class);
    log.debug("Before sending mail, checking date not expired: {}", model.getDateExpiry());
    if (dateValid(model.getDateExpiry()))
    {
      if (model.isStoreInFile())
      {
        storeEmailInFile(model);
      }
      log.debug("About to send email with subject: {}", model.getSubject());
      sendEmail(model);
    }
  }

  private void sendEmail(final EmailModel emailModel)
  {
    uk.co.uworx.khoji_email.EmailModel model = new uk.co.uworx.khoji_email.EmailModel(emailModel.getTo(),
            emailConfig.from, emailConfig.host, emailConfig.port, emailConfig.emailUsername, emailConfig.emailPassword, ContentType.html.toString(), emailModel.getSubject(),
            emailModel.getBody(), true, emailModel.getImages(), emailConfig.mailSmtpStarttlsEnable, emailConfig.mailSmtpSslProtocols);
    SendEmail.sendEmail(model);
  }

  private void storeEmailInFile(EmailModel model) throws FileNotFoundException, UnsupportedEncodingException
  {
    //Store the email content in a file.
    String emailSubject;
    emailSubject = model.getSubject().substring(model.getSubject().indexOf("("), model.getSubject().indexOf(")") + 1);

    PrintWriter writer = new PrintWriter(model.getTo() + " " + emailSubject + " " + System.currentTimeMillis()
            + ".html", "UTF-8");
    writer.println(model.getBody());
    writer.close();
  }

  /**
   * Checks if the date is of today.
   */
  private boolean dateValid(String date)
  {
    LocalDate today = LocalDate.now();
    if (today.toString().equals(date))
    {
      return true;
    }
    return false;
  }
}
