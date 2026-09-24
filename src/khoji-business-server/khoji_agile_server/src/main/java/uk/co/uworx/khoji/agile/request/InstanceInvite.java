package uk.co.uworx.khoji.agile.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class InstanceInvite
{
  Long instanceId;
  boolean action;
}
