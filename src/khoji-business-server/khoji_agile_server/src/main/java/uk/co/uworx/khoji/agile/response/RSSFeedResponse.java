package uk.co.uworx.khoji.agile.response;


import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class RSSFeedResponse
{
  private String title;
  private String description;
  private String link;
  private String publishDate;
  private String thumbnail;
}