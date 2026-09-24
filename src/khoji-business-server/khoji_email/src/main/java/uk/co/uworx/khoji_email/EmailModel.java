package uk.co.uworx.khoji_email;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class EmailModel
{
  private String to;
  private String from;
  private String host;

  private String port;
  private String username;
  private String password;
  private String contentType;
  private String subject;
  private String body;
  private List<String> images;
  private boolean emailSmtpAuthEnabled;
  private boolean mailSmtpStarttlsEnable;
  private String mailSmtpSslProtocols;

  public enum ContentType
  {
    html("text/html"), text("text/plain");
    private String value;

    ContentType(final String text)
    {
      this.value = text;
    }

    @Override
    public String toString()
    {
      return value;
    }

    public static String getKey(String key)
    {
      for (ContentType e : ContentType.values())
      {
        if (key.equals(e.value))
          return e.name();
      }
      return null;
    }
  }

  /**
   * @param to
   * @param from
   * @param host
   * @param contentType
   * @param subject
   * @param body
   */
  public EmailModel(
          String to,
          String from,
          String host,
          String port,
          String username,
          String password,
          String contentType,
          String subject,
          String body,
          boolean emailSmtpAuthEnabled,
          List<String> images,
          boolean mailSmtpStarttlsEnable,
          String mailSmtpSslProtocols
  )
  {
    super();
    this.to = to;
    this.from = from;
    this.host = host;
    this.port = port;
    this.username = username;
    this.password = password;
    this.contentType = contentType;
    this.subject = subject;
    this.body = body;
    this.images = images;
    this.emailSmtpAuthEnabled = emailSmtpAuthEnabled;
    this.mailSmtpStarttlsEnable = mailSmtpStarttlsEnable;
    this.mailSmtpSslProtocols = mailSmtpSslProtocols;
  }

  @Override
  public String toString()
  {
    return "EmailModel{" +
            "to='" + to + '\'' +
            ", from='" + from + '\'' +
            ", host='" + host + '\'' +
            ", port='" + port + '\'' +
            ", username='" + username + '\'' +
            ", contentType='" + contentType + '\'' +
            ", subject='" + subject + '\'' +
            ", body='" + body + '\'' +
            ", images=" + images +
            ", emailSmtpAuthEnabled=" + emailSmtpAuthEnabled +
            ", mailSmtpStarttlsEnable" + mailSmtpStarttlsEnable +
            ", mailSmtpSslProtocols" + mailSmtpSslProtocols +
            '}';
  }
}
