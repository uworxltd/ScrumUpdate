package uk.co.uworx.khoji.agile.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class UserAccountModel
{
  List<String> invalidEntries;
  List<Info> users;

  @AllArgsConstructor
  @NoArgsConstructor
  @Getter
  @Setter
  public static class Info {
    String fullName;
    String email;
    String imageUrl;
  }
}

