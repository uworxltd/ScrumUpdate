/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import java.io.Serializable;
import java.util.List;

public class EmailModel implements Serializable
{
  private static final long serialVersionUID = -404607170707700980L;
  
  private String to;
  private String subject;
  private String body;
  private String dateExpiry;
  private boolean storeInFile;
  private List<String> images;
  
  public EmailModel()
  {
  }
  
  /**
   * @param to
   * @param subject
   * @param body
   */
  public EmailModel(String to, String subject, String body,String dateExpiry, boolean storeInFile, List<String> images)
  {
    super();
    this.to = to;
    this.subject = subject;
    this.body = body;
    this.dateExpiry = dateExpiry;
    this.storeInFile = storeInFile;
    this.images = images;
  }

  /**
   * @return the to
   */
  public String getTo()
  {
    return to;
  }

  /**
   * @param to the to to set
   */
  public void setTo(String to)
  {
    this.to = to;
  }

  /**
   * @return the subject
   */
  public String getSubject()
  {
    return subject;
  }

  /**
   * @param subject the subject to set
   */
  public void setSubject(String subject)
  {
    this.subject = subject;
  }

  /**
   * @return the body
   */
  public String getBody()
  {
    return body;
  }

  /**
   * @param body the body to set
   */
  public void setBody(String body)
  {
    this.body = body;
  }

  /**
   * @return the dateExpiry
   */
  public String getDateExpiry()
  {
    return dateExpiry;
  }

  /**
   * @param dateExpiry the dateExpiry to set
   */
  public void setDateExpiry(String dateExpiry)
  {
    this.dateExpiry = dateExpiry;
  }

  public boolean isStoreInFile()
  {
    return storeInFile;
  }

  public void setStoreInFile(final boolean storeInFile)
  {
    this.storeInFile = storeInFile;
  }

  public List<String> getImages()
  {
    return images;
  }

  public void setImages(List<String> images)
  {
    this.images = images;
  }
}
