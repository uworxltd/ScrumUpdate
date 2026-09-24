package uk.co.uworx.khoji.agile.internal.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
public class SubscriptionValidityCacheModel
{
  private boolean allowLogin;
  private LocalDateTime lastUpdatedAt;
}
