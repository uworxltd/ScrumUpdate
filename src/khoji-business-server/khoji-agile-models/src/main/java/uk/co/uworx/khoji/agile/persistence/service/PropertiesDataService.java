package uk.co.uworx.khoji.agile.persistence.service;

import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.persistence.model.Properties;
import uk.co.uworx.khoji.agile.persistence.repository.PropertiesRepository;

import java.util.List;

@Service
public class PropertiesDataService
{
  @Value("${spring.profiles.active}")
  private String profile;

  @Autowired
  private PropertiesRepository propertiesRepository;

  public Properties saveProp(String key, String value)
  {
    Properties properties = getProp(key);
    if (properties != null)
    {
      properties.setValue(value);
      return propertiesRepository.save(properties);
    }
    return propertiesRepository.save(new Properties(
            profile,
            null,
            key,
            value
    ));
  }

  public Properties getProp(String key)
  {
    return propertiesRepository.findByKey(key).orElse(null);
  }

  public List<Properties> getAllProperties()
  {
    return  propertiesRepository.findAll();
  }

  @Transactional
  public void deleteAllKeys()
  {
    propertiesRepository.deleteAll();
  }
}
