package uk.co.uworx.khoji.agile.handler;

import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;
import uk.co.uworx.khoji.agile.response.RSSFeedResponse;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.List;


@Service
@Log4j2
public class RSSFeedHandler
{
  @Value("${khoji.RSS.feed.url:http://localhost/feed/}")
  public String RSS_FEED_URL;



  public List<RSSFeedResponse> getRssFeed() {
    List<RSSFeedResponse> feedResponses = new ArrayList<>();
    try {
      RestTemplate restTemplate = new RestTemplate();
      String response = restTemplate.getForObject(RSS_FEED_URL, String.class);

      DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
      DocumentBuilder builder = factory.newDocumentBuilder();
      Document document = builder.parse(new InputSource(new StringReader(response)));

      document.getDocumentElement().normalize();

      NodeList items = document.getElementsByTagName("item");
      for (int i = 0; i < items.getLength(); i++) {
        Node node = items.item(i);
        if (node.getNodeType() == Node.ELEMENT_NODE) {
          Element element = (Element) node;

          RSSFeedResponse feedResponse = new RSSFeedResponse();
          feedResponse.setTitle(getElementValue(element, "title"));
          feedResponse.setDescription(getElementValue(element, "description"));
          feedResponse.setLink(getElementValue(element, "link"));
          feedResponse.setPublishDate(getElementValue(element, "pubDate"));
          feedResponse.setThumbnail(getElementValue(element, "thumbnail"));

          feedResponses.add(feedResponse);
        }
      }
    } catch (Exception exception) {
      log.error("Error fetching and parsing RSS feed", exception);
    }
    return feedResponses;
  }

  private String getElementValue(Element parent, String tagName) {
    NodeList nodes = parent.getElementsByTagName(tagName);
    if (nodes.getLength() > 0) {
      Node node = nodes.item(0);
      return node.getTextContent();
    }
    return null;
  }
}