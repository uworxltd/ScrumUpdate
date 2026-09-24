package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.annotation.JsonView;
import uk.co.uworx.khoji.agile.internal.model.request.Views;

import jakarta.persistence.Cacheable;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.io.Serializable;

@Cacheable
public class UserProfileImage implements Serializable
{
  @Id
  @GeneratedValue(strategy = GenerationType.AUTO, generator = "hibernate_sequence")
  private Long id;
  @JsonView({Views.UserProfileView.class, Views.BasicUser.class})
  private String url;
  @JsonView({Views.UserProfileView.class, Views.BasicUser.class})
  @Lob
  private byte[] image;

  public UserProfileImage()
  {
  }

  public UserProfileImage(String url)
  {
    this.url = url;
  }

  public Long getId()
  {
    return id;
  }

  public void setId(Long id)
  {
    this.id = id;
  }

  public String getUrl()
  {
    return url;
  }

  public void setUrl(String url)
  {
    this.url = url;
  }

  public byte[] getImage()
  {
    return image;
  }

  public void setImage(byte[] image)
  {
    this.image = image;
  }
}
