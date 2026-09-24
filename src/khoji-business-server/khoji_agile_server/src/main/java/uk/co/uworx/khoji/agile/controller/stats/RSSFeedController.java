package uk.co.uworx.khoji.agile.controller.stats;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.handler.RSSFeedHandler;
import uk.co.uworx.khoji.agile.response.RSSFeedResponse;

import java.util.List;



@CrossOrigin
@RestController
public class RSSFeedController
{
  @Autowired
  private RSSFeedHandler rssFeedHandler;

  @GetMapping(value = "/getRssFeed", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<List<RSSFeedResponse>> getRssFeed()
  {
    return new ResponseEntity<>(rssFeedHandler.getRssFeed(), HttpStatus.OK);
  }
}