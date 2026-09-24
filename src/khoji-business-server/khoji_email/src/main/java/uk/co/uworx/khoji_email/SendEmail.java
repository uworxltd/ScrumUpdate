package uk.co.uworx.khoji_email;

import lombok.extern.log4j.Log4j2;

import jakarta.activation.DataHandler;
import jakarta.activation.DataSource;
import jakarta.activation.FileDataSource;
import jakarta.mail.*;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeBodyPart;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import jakarta.mail.util.ByteArrayDataSource;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.Date;
import java.util.Properties;

@Log4j2
public class SendEmail extends Thread
{

  public static void sendEmail(final EmailModel emailModel)
  {
    //Get the session object
    Properties properties = System.getProperties();
    properties.setProperty("mail.smtp.host", emailModel.getHost());
    properties.setProperty("mail.smtp.port", emailModel.getPort());
    Session session = null;

    log.debug(emailModel.toString());
    if (emailModel.isEmailSmtpAuthEnabled())
    {
      properties.put("mail.smtp.auth", Boolean.toString(emailModel.isEmailSmtpAuthEnabled()));
      if(emailModel.isMailSmtpStarttlsEnable())
      {
        log.debug("emailModel.isMailSmtpStarttlsEnable()");
        properties.setProperty("mail.smtp.starttls.enable", Boolean.toString(emailModel.isMailSmtpStarttlsEnable()));
        properties.put("mail.smtp.ssl.protocols", emailModel.getMailSmtpSslProtocols());
      }
      session = Session.getDefaultInstance(properties, new Authenticator()
      {
        protected PasswordAuthentication getPasswordAuthentication()
        {
          return new PasswordAuthentication(emailModel.getUsername(), emailModel.getPassword());
        }
      });
    }
    else
    {
      session = Session.getDefaultInstance(properties);
    }

    log.debug("Email triggered from {} with host {}", emailModel.getFrom(), emailModel.getHost());

    try
    {
      MimeMessage message = new MimeMessage(session);
      message.setFrom(new InternetAddress(emailModel.getFrom()));
      log.debug("Inet address set");
      message.addRecipient(Message.RecipientType.TO, new InternetAddress(emailModel.getTo()));
      message.setSubject(emailModel.getSubject());

      Date timeStamp = new Date();
      message.setSentDate(timeStamp);

      if (emailModel.getContentType() != null && emailModel.getContentType().equals(EmailModel.ContentType.html.toString()))
      {
        // Prepare a multipart HTML
        Multipart multipart = new MimeMultipart();
        // Prepare the HTML
        BodyPart htmlPart = new MimeBodyPart();
        htmlPart.setContent(emailModel.getBody(), "text/html");

        ClassLoader classLoader = Thread.currentThread().getContextClassLoader();
        if (classLoader == null)
        {
          classLoader = SendEmail.class.getClassLoader();
        }

        if (emailModel.getImages() != null)
        {
          for (String image : emailModel.getImages())
          {
            attachImage(multipart, classLoader, image);
          }
        }
        multipart.addBodyPart(htmlPart);

        message.setContent(multipart);
      }
      else if (emailModel.getContentType() != null)
      {
        message.setContent(emailModel.getBody(), emailModel.getContentType());
      }
      else
      {
        message.setText(emailModel.getBody());
      }
      log.debug("About to sent email message");
      Transport.send(message);
      log.info("email sent successfully");
    }
    catch (Exception exception)
    {
      log.error(exception);
      log.error("Exception occurred hence email not sent");
    }
  }

  private static void attachImage(Multipart multipart, ClassLoader classLoader, String image) throws IOException, MessagingException
  {
    File imageFile = new File(image);
    if (imageFile.exists())
    {
      DataSource ds = new FileDataSource(imageFile);
      attachData(multipart, ds, image);
    }
    else
    {
      InputStream inputStream = classLoader.getResourceAsStream(image);
      if (inputStream != null)
      {
        ByteArrayDataSource byteArrayDataSource = new ByteArrayDataSource(inputStream, "image/png");
        attachData(multipart, byteArrayDataSource, image);
      }
    }
  }

  private static void attachData(Multipart multipart, DataSource dataSource, String name) throws MessagingException
  {
    BodyPart imgPart = new MimeBodyPart();
    imgPart.setDataHandler(new DataHandler(dataSource));
    imgPart.setHeader("Content-ID", "<" + name + ">");
    imgPart.setHeader("Content-Type", "image/png");
    imgPart.setHeader("Content-Disposition", "attachment; filename=\"" + name.substring(name.lastIndexOf('/') != -1 ? name.lastIndexOf('/') + 1 : name.lastIndexOf('\\') != -1 ? name.lastIndexOf('\\') + 1 : 0) + "\"");
    multipart.addBodyPart(imgPart);
  }
}