package uk.co.uworx.khoji.agile.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;


public class Team
{
  @Getter
  @Setter
  @AllArgsConstructor
  @NoArgsConstructor
  public static class Request {
    List<Long> teamIds;
  }
}
