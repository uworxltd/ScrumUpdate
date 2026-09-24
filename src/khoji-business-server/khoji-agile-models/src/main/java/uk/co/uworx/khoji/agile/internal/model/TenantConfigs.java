package uk.co.uworx.khoji.agile.internal.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import uk.co.uworx.khoji.agile.internal.model.multi.tenant.TenantDetails;

import jakarta.persistence.Cacheable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;


@Getter
@Setter
@AllArgsConstructor
@Builder
@NoArgsConstructor
@Cacheable
public class TenantConfigs
{
  @Id
  @GeneratedValue(strategy = GenerationType.AUTO, generator = "hibernate_sequence")
  private long id;

  @ManyToOne
  @JoinColumn(name = "tenant_id")
  private TenantDetails tenantId;

  @Column(name = "prop_key")
  private String propKey;

  @Column(name = "prop_value")
  private String propValue;

  public TenantConfigs(TenantDetails tenantId, String propKey, String propValue)
  {
    this.tenantId = tenantId;
    this.propKey = propKey;
    this.propValue = propValue;
  }
}
