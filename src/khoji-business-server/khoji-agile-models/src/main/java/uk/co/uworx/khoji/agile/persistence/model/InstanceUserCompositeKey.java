package uk.co.uworx.khoji.agile.persistence.model;


import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InstanceUserCompositeKey
{
  String accountId;
  long instanceId;
}
